import os
import streamlit.components.v1 as components

# Determine if we are in release (production) or development mode
_RELEASE = True  # Switch to False for development

if not _RELEASE:
    _component_func = components.declare_component(
        "pcm_audio_player",
        url="http://localhost:3000",
    )
else:
    # Target the Frontend Production Build Path
    parent_dir = os.path.dirname(os.path.abspath(__file__))
    build_dir = os.path.join(parent_dir, "frontend/build")
    _component_func = components.declare_component("pcm_audio_player", path=build_dir)

def pcm_audio_player(src: str, key=None):
    """
    Creates a new instance of the pcm_audio_player component.

    Parameters
    ----------
    src: str
        raw PCM data files content(base64).
        PCM parameters (16kHz, 1 channel, s16le) are hardcoded in the frontend.
    key: str or None
        An optional key for the component.

    Returns
    -------
    None
    """
    component_value = _component_func(src=src, key=key, default=0)
    return component_value