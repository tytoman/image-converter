//! Safe discovery and primary-item selection for still HEIF containers.
//!
//! `heic-rs` provides the bounded ISO-BMFF/HEIF parser used here. We only
//! expose visible coded HEVC items and grid derivations; auxiliary planes,
//! thumbnails, grid tiles, and hidden items are implementation details.

use heic_rs::context::Context;
use heic_rs::ftyp::Brand;
use heic_rs::meta::iref::RefKind;
use heic_rs::{boxes::BoxIter, Error as HeifError};

const MAX_ITEMS: usize = 1000;

/// Return the displayable still-image item IDs, with the primary item first.
/// Sequence-branded HEIF containers are rejected instead of being silently
/// treated as a one-frame still image.
pub fn item_ids(bytes: &[u8]) -> Result<Vec<u32>, String> {
    if has_sequence_brand(bytes)? {
        return Err("HEIF image sequences are not supported; choose a still-image file".into());
    }

    let context = Context::open(bytes).map_err(heif_error)?;
    if context.meta.items.len() > MAX_ITEMS {
        return Err("HEIF contains more than 1,000 image items".into());
    }
    let primary = context.meta.primary;
    let primary_info = context
        .meta
        .item(primary)
        .ok_or_else(|| format!("HEIF primary item {primary} is missing"))?;
    if primary_info.hidden {
        return Err("HEIF primary image item is marked hidden".into());
    }
    if !is_displayable(primary_info) {
        return Err("HEIF primary item is not a supported still image".into());
    }

    let tile_ids: Vec<u32> = context
        .meta
        .refs
        .iter()
        .filter(|r| r.kind == RefKind::Dimg)
        .flat_map(|r| r.to.iter().copied())
        .collect();
    let helper_ids: Vec<u32> = context
        .meta
        .refs
        .iter()
        .filter(|r| matches!(r.kind, RefKind::Auxl | RefKind::Thmb))
        .map(|r| r.from)
        .collect();

    let mut visible = Vec::new();
    visible.push(primary);
    for item in &context.meta.items {
        if item.id == primary || item.hidden || !is_displayable(item) {
            continue;
        }
        if tile_ids.contains(&item.id) || helper_ids.contains(&item.id) {
            continue;
        }
        visible.push(item.id);
        if visible.len() > MAX_ITEMS {
            return Err("HEIF contains more than 1,000 visible still-image items".into());
        }
    }
    Ok(visible)
}

/// Copy a still HEIF file and change its `pitm` primary item to `item_id`.
/// Callers should pass an ID returned by [`item_ids`]. Box traversal and all
/// offset arithmetic are checked before writing the two- or four-byte ID.
pub fn rewrite_primary(bytes: &[u8], item_id: u32) -> Result<Vec<u8>, String> {
    let ids = item_ids(bytes)?;
    if !ids.contains(&item_id) {
        return Err(format!("HEIF item {item_id} is not a visible still image"));
    }

    let meta_box = BoxIter::new(bytes)
        .find(b"meta")
        .map_err(heif_error)?
        .ok_or_else(|| "HEIF meta box is missing".to_string())?;
    if meta_box.payload.len() < 4 {
        return Err("HEIF meta full-box header is truncated".into());
    }
    let meta_header = box_header_len(bytes, meta_box.offset)?;
    let children = &meta_box.payload[4..]; // meta version + flags
    let pitm_box = BoxIter::new(children)
        .find(b"pitm")
        .map_err(heif_error)?
        .ok_or_else(|| "HEIF primary item box is missing".to_string())?;
    if pitm_box.payload.len() < 6 {
        return Err("HEIF pitm item identifier is truncated".into());
    }
    let version = pitm_box.payload[0];
    let id_width = match version {
        0 => 2usize,
        1 => 4usize,
        _ => return Err(format!("HEIF pitm version {version} is not supported")),
    };
    if id_width == 2 && item_id > u16::MAX as u32 {
        return Err("HEIF item ID does not fit this pitm version".into());
    }

    let pitm_start = meta_box
        .offset
        .checked_add(meta_header)
        .and_then(|n| n.checked_add(4))
        .and_then(|n| n.checked_add(pitm_box.offset))
        .ok_or_else(|| "HEIF pitm offset overflow".to_string())?;
    let pitm_header = box_header_len(bytes, pitm_start)?;
    let id_start = pitm_start
        .checked_add(pitm_header)
        .and_then(|n| n.checked_add(4)) // pitm version + flags
        .ok_or_else(|| "HEIF item ID offset overflow".to_string())?;
    let id_end = id_start
        .checked_add(id_width)
        .ok_or_else(|| "HEIF item ID range overflow".to_string())?;
    if id_end > bytes.len() || pitm_box.payload.get(4..4 + id_width).is_none() {
        return Err("HEIF pitm item identifier lies outside the input".into());
    }

    let mut output = bytes.to_vec();
    if id_width == 2 {
        output[id_start..id_end].copy_from_slice(&(item_id as u16).to_be_bytes());
    } else {
        output[id_start..id_end].copy_from_slice(&item_id.to_be_bytes());
    }
    Ok(output)
}

fn is_displayable(item: &heic_rs::meta::iinf::ItemInfo<'_>) -> bool {
    item.is_hevc() || item.is_grid()
}

fn has_sequence_brand(bytes: &[u8]) -> Result<bool, String> {
    let ftyp = BoxIter::new(bytes)
        .find(b"ftyp")
        .map_err(heif_error)?
        .ok_or_else(|| "HEIF ftyp box is missing".to_string())?;
    let mut reader = ftyp.reader();
    let major = reader.fourcc("HEIF ftyp major brand").map_err(heif_error)?;
    let _minor = reader.u32("HEIF ftyp minor version").map_err(heif_error)?;
    let mut sequence = matches!(Brand::from_fourcc(&major), Some(Brand::Hevc | Brand::Msf1));
    while reader.remaining() >= 4 {
        let brand = reader
            .fourcc("HEIF ftyp compatible brand")
            .map_err(heif_error)?;
        sequence |= brand == *b"hevc" || brand == *b"msf1";
    }
    Ok(sequence)
}

fn box_header_len(bytes: &[u8], offset: usize) -> Result<usize, String> {
    let size_bytes = bytes
        .get(offset..offset.checked_add(4).ok_or("HEIF box offset overflow")?)
        .ok_or_else(|| "HEIF box header is truncated".to_string())?;
    let size = u32::from_be_bytes(size_bytes.try_into().unwrap());
    let header_len = if size == 1 { 16 } else { 8 };
    let header_end = offset
        .checked_add(header_len)
        .ok_or_else(|| "HEIF box header offset overflow".to_string())?;
    if bytes.get(offset..header_end).is_none() {
        return Err("HEIF extended box header is truncated".into());
    }
    Ok(header_len)
}

fn heif_error(error: HeifError) -> String {
    format!("HEIF container parse failed: {error}")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn box_bytes(kind: &[u8; 4], payload: &[u8]) -> Vec<u8> {
        let mut out = Vec::with_capacity(payload.len() + 8);
        out.extend_from_slice(&((payload.len() + 8) as u32).to_be_bytes());
        out.extend_from_slice(kind);
        out.extend_from_slice(payload);
        out
    }

    fn full_box(kind: &[u8; 4], version: u8, flags: u32, payload: &[u8]) -> Vec<u8> {
        let mut body = vec![
            version,
            (flags >> 16) as u8,
            (flags >> 8) as u8,
            flags as u8,
        ];
        body.extend_from_slice(payload);
        box_bytes(kind, &body)
    }

    fn item_info(id: u16, kind: &[u8; 4], hidden: bool) -> Vec<u8> {
        let mut body = Vec::new();
        body.extend_from_slice(&id.to_be_bytes());
        body.extend_from_slice(&0u16.to_be_bytes()); // protection index
        body.extend_from_slice(kind);
        body.push(0); // item name
        full_box(b"infe", 2, if hidden { 1 } else { 0 }, &body)
    }

    fn fixture(major: &[u8; 4], items: &[(u16, &[u8; 4], bool)], refs: &[Vec<u8>]) -> Vec<u8> {
        let mut ftyp_payload = major.to_vec();
        ftyp_payload.extend_from_slice(&0u32.to_be_bytes());
        ftyp_payload.extend_from_slice(b"mif1");
        let ftyp = box_bytes(b"ftyp", &ftyp_payload);

        let mut hdlr_payload = 0u32.to_be_bytes().to_vec();
        hdlr_payload.extend_from_slice(b"pict");
        let hdlr = full_box(b"hdlr", 0, 0, &hdlr_payload);
        let pitm = full_box(b"pitm", 0, 0, &1u16.to_be_bytes());
        let mut infos = (items.len() as u16).to_be_bytes().to_vec();
        for (id, kind, hidden) in items {
            infos.extend_from_slice(&item_info(*id, kind, *hidden));
        }
        let iinf = full_box(b"iinf", 0, 0, &infos);
        let mut meta_children = hdlr;
        meta_children.extend_from_slice(&pitm);
        meta_children.extend_from_slice(&iinf);
        if !refs.is_empty() {
            let refs_payload = refs.concat();
            meta_children.extend_from_slice(&full_box(b"iref", 0, 0, &refs_payload));
        }
        let meta = full_box(b"meta", 0, 0, &meta_children);

        let mut file = ftyp;
        file.extend_from_slice(&meta);
        file
    }

    #[test]
    fn enumerates_primary_before_visible_items_and_skips_hidden_items() {
        let file = fixture(b"heic", &[(1, b"hvc1", false), (2, b"hvc1", true)], &[]);
        assert_eq!(item_ids(&file).unwrap(), vec![1]);
    }

    #[test]
    fn collection_skips_grid_tiles_thumbnails_and_auxiliary_images() {
        let items = [
            (1, b"hvc1", false),
            (2, b"grid", false),
            (3, b"hvc1", false),
            (4, b"hvc1", false),
            (5, b"hvc1", false),
            (6, b"hvc1", true),
        ];
        let refs = [
            reference(b"dimg", 2, 3),
            reference(b"auxl", 4, 1),
            reference(b"thmb", 5, 1),
        ];
        let file = fixture(b"heic", &items, &refs);
        assert_eq!(item_ids(&file).unwrap(), vec![1, 2]);
    }

    #[test]
    fn rewrite_changes_only_the_primary_item_identifier() {
        let file = fixture(b"heic", &[(1, b"hvc1", false), (2, b"hvc1", false)], &[]);
        assert_eq!(item_ids(&file).unwrap(), vec![1, 2]);
        let selected = rewrite_primary(&file, 2).unwrap();
        assert_eq!(Context::open(&selected).unwrap().meta.primary, 2);
        assert!(rewrite_primary(&file, 99).is_err());
    }

    #[test]
    fn sequence_brand_is_rejected_before_still_item_enumeration() {
        let file = fixture(b"msf1", &[(1, b"hvc1", false)], &[]);
        assert!(item_ids(&file)
            .unwrap_err()
            .contains("sequences are not supported"));
    }

    #[test]
    fn malformed_box_lengths_are_rejected_without_panicking() {
        let mut file = fixture(b"heic", &[(1, b"hvc1", false)], &[]);
        file[..4].copy_from_slice(&u32::MAX.to_be_bytes());
        assert!(item_ids(&file).is_err());
        assert!(rewrite_primary(&file, 1).is_err());
    }

    #[test]
    fn valid_still265_container_round_trips_primary_selection() {
        let rgb = vec![80u8; 4 * 4 * 3];
        let image = still265::Image::from_rgb8(&rgb, 4, 4, still265::ColorSpace::YCbCr, true, 8);
        let encoder = still265::RustStillHevcEncoder::new(still265::Effort::Fast);
        let encoded =
            still265::encode_heic(image, &encoder, 30, still265::HeicEncodeOptions::default())
                .expect("valid tiny HEIC fixture");
        let ids = item_ids(&encoded).expect("enumerate encoded still");
        assert_eq!(ids.len(), 1);
        let selected = rewrite_primary(&encoded, ids[0]).expect("preserve selected item");
        assert_eq!(Context::open(&selected).unwrap().meta.primary, ids[0]);
    }

    fn reference(kind: &[u8; 4], from: u16, to: u16) -> Vec<u8> {
        let mut body = from.to_be_bytes().to_vec();
        body.extend_from_slice(&1u16.to_be_bytes());
        body.extend_from_slice(&to.to_be_bytes());
        box_bytes(kind, &body)
    }
}
