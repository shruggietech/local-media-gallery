<?php
/** Generated content-only stylesheet hooks. */
add_action( 'after_setup_theme', function () { add_theme_support( 'editor-styles' ); add_editor_style( 'assets/css/stbb-content.css' ); } );
add_action( 'init', function () { register_block_style( 'core/group', array( 'name' => 'stbb-localmedia-gallery-card', 'label' => 'Brand card' ) ); } );
add_action( 'wp_enqueue_scripts', function () { wp_enqueue_style( 'stbb-localmedia-gallery-content', get_theme_file_uri( 'assets/css/stbb-content.css' ), array(), 'be2ae9a458129dd22894d751e883f5b3d255087cd68bac0b957497e44a05024a' ); } );
