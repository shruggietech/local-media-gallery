// SPDX-License-Identifier: Apache-2.0
#![cfg(target_os = "linux")]
use glib_compat::prelude::*;
use std::hint::black_box;

#[test]
fn optimized_string_variant_iterator_preserves_values_and_boundaries() {
    let values = ["", "alpha", "雪", "space value", "omega"];
    for _ in 0..128 {
        let variant = black_box(values.to_variant());
        assert_eq!(
            variant.array_iter_str().unwrap().collect::<Vec<_>>(),
            values
        );
        assert_eq!(
            variant.array_iter_str().unwrap().rev().collect::<Vec<_>>(),
            values.into_iter().rev().collect::<Vec<_>>()
        );
        let mut mixed = variant.array_iter_str().unwrap();
        assert_eq!(mixed.next(), Some(""));
        assert_eq!(mixed.next_back(), Some("omega"));
        assert_eq!(mixed.nth(1), Some("雪"));
        assert_eq!(mixed.nth_back(0), Some("space value"));
        assert_eq!(mixed.len(), 0);
        assert_eq!(mixed.next(), None);
        assert_eq!(mixed.next_back(), None);
        assert_eq!(variant.array_iter_str().unwrap().last(), Some("omega"));
        let mut overflow = variant.array_iter_str().unwrap();
        assert_eq!(overflow.nth(usize::MAX), None);
        assert_eq!(overflow.next(), None);
        let mut overflow_back = variant.array_iter_str().unwrap();
        assert_eq!(overflow_back.nth_back(usize::MAX), None);
        assert_eq!(overflow_back.next_back(), None);
    }
    let empty: Vec<String> = vec![];
    let variant = empty.to_variant();
    assert_eq!(variant.array_iter_str().unwrap().next(), None);
    assert_eq!(variant.array_iter_str().unwrap().next_back(), None);
    assert_eq!(variant.array_iter_str().unwrap().last(), None);
}
