#[cfg(not(target_arch = "wasm32"))]
pub use std::time::Instant;

// Encoder timing is diagnostic only. wasm32-unknown-unknown has no std clock,
// so keep the same algorithm and return zero elapsed time for profiling data.
#[cfg(target_arch = "wasm32")]
#[derive(Clone, Copy, Debug)]
pub struct Instant;

#[cfg(target_arch = "wasm32")]
impl Instant {
    pub fn now() -> Self {
        Self
    }

    pub fn elapsed(&self) -> std::time::Duration {
        std::time::Duration::ZERO
    }
}
