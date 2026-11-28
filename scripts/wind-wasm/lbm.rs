// Standalone counterpart of src/features/analysis/lbm.ts. f64 intermediates
// preserve JavaScript rounding before storing the D2Q9 populations as f32.
use std::cell::RefCell;

const EX: [isize; 9] = [0, 1, 0, -1, 0, 1, -1, -1, 1];
const EY: [isize; 9] = [0, 0, 1, 0, -1, 1, 1, -1, -1];
const W: [f64; 9] = [
    4.0 / 9.0, 1.0 / 9.0, 1.0 / 9.0, 1.0 / 9.0, 1.0 / 9.0,
    1.0 / 36.0, 1.0 / 36.0, 1.0 / 36.0, 1.0 / 36.0,
];
const OPP: [usize; 9] = [0, 3, 4, 1, 2, 7, 8, 5, 6];

struct Grid {
    nx: usize,
    ny: usize,
    solid: Vec<u8>,
    f: Vec<f32>,
    tmp: Vec<f32>,
}

// One grid per Wasm instance. JS borrows typed-array views only between
// calls and reacquires them after setup or a step that swaps the buffers.
thread_local! {
    static GRID: RefCell<Option<Grid>> = const { RefCell::new(None) };
}

#[no_mangle]
pub extern "C" fn setup(nx: usize, ny: usize) {
    assert!(nx >= 2 && ny >= 2 && nx <= 512 && ny <= 512);
    let n = nx * ny;
    GRID.with_borrow_mut(|grid| *grid = Some(Grid {
        nx, ny, solid: vec![0; n], f: vec![0.0; 9 * n], tmp: vec![0.0; 9 * n],
    }));
}

#[no_mangle]
pub extern "C" fn solid_ptr() -> *mut u8 {
    GRID.with_borrow_mut(|grid| grid.as_mut().unwrap().solid.as_mut_ptr())
}

#[no_mangle]
pub extern "C" fn f_ptr() -> *mut f32 {
    GRID.with_borrow_mut(|grid| grid.as_mut().unwrap().f.as_mut_ptr())
}

#[no_mangle]
pub extern "C" fn tmp_ptr() -> *mut f32 {
    GRID.with_borrow_mut(|grid| grid.as_mut().unwrap().tmp.as_mut_ptr())
}

#[inline]
fn equilibrium(k: usize, rho: f64, ux: f64, uy: f64) -> f64 {
    let eu = EX[k] as f64 * ux + EY[k] as f64 * uy;
    W[k] * rho * (1.0 + 3.0 * eu + 4.5 * eu * eu - 1.5 * (ux * ux + uy * uy))
}

#[inline]
fn moments(f: &[f32], n: usize, i: usize) -> (f64, f64, f64) {
    let (mut rho, mut mx, mut my) = (0.0, 0.0, 0.0);
    for k in 0..9 {
        let value = f[k * n + i] as f64;
        rho += value;
        mx += value * EX[k] as f64;
        my += value * EY[k] as f64;
    }
    (rho, mx / rho, my / rho)
}

#[no_mangle]
pub extern "C" fn step(steps: u32, omega: f64, u0: f64, exchange: f64) {
    GRID.with_borrow_mut(|grid| {
        let Grid { nx, ny, solid, f, tmp } = grid.as_mut().unwrap();
        let (nx, ny) = (*nx, *ny);
        let n = nx * ny;
        for _ in 0..steps {
            for y in 0..ny {
                for x in 0..nx {
                    let i = y * nx + x;
                    if solid[i] != 0 {
                        continue;
                    }
                    let (rho, ux, uy) = moments(f, n, i);
                    for k in 0..9 {
                        let tx = x as isize + EX[k];
                        let ty = y as isize + EY[k];
                        if tx < 0 || tx >= nx as isize || ty < 0 || ty >= ny as isize {
                            continue;
                        }
                        let value = f[k * n + i] as f64;
                        let mut post = value - omega * (value - equilibrium(k, rho, ux, uy));
                        if exchange > 0.0 {
                            post -= exchange * (post - equilibrium(k, rho, u0, 0.0));
                        }
                        let j = ty as usize * nx + tx as usize;
                        let destination = if solid[j] != 0 { OPP[k] * n + i } else { k * n + j };
                        tmp[destination] = post as f32;
                    }
                }
            }
            for k in 0..9 {
                let far = equilibrium(k, 1.0, u0, 0.0) as f32;
                let offset = k * n;
                tmp[offset..offset + nx].fill(far);
                tmp[offset + n - nx..offset + n].fill(far);
            }
            for y in 0..ny {
                let row = y * nx;
                let (_, ux, uy) = moments(tmp, n, row + nx - 2);
                for k in 0..9 {
                    tmp[k * n + row] = equilibrium(k, 1.0, u0, 0.0) as f32;
                    tmp[k * n + row + nx - 1] = equilibrium(k, 1.0, ux, uy) as f32;
                }
            }
            std::mem::swap(f, tmp);
        }
    });
}
