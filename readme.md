# st_pcm_player

## Usage
```python
import streamlit as st
import httpx
import base64
from st_pcm_player import pcm_audio_player

# 获取PCM文件的base64内容
url = "https://example.com/path/to/your/audio.raw"
with httpx.Client(timeout=None) as client:
    response = client.get(url)
    pcm_data = base64.b64encode(response.content).decode('utf-8')
pcm_audio_player(src=pcm_data, key="audio_player")
```