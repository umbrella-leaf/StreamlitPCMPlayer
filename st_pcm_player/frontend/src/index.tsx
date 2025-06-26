import {
  Streamlit,
  StreamlitComponentBase,
  withStreamlitConnection,
} from "streamlit-component-lib"
import React, {ReactNode} from "react"
import ReactDOM from "react-dom";
import { fetchPCMAudio, concatArrayBuffers } from "./helpers"

interface State {
  audioSrc: string | null;
  isLoading: boolean;
  error: string | null;
}

interface Args {
  src: string;
}

class PcmAudioPlayer extends StreamlitComponentBase<State> {
  // Use useRef to maintain a reference to the AbortController
  // so that it can be accessed through the re-renders without causing the effect to run again.
  private abortController = new AbortController();

  constructor(props: any) {
    super(props)
    this.state = { audioSrc: null, isLoading: false, error: null }
  }

  public componentDidMount() {
    this.processAudio();
  }

  public componentWillUnmount() {
    // Abort the fetch and clean up the object's URL when the component is disassembled
    this.abortController.abort();
    if (this.state.audioSrc) {
      URL.revokeObjectURL(this.state.audioSrc);
    }
  }

  private processAudio = async () => {
    const { src }: Args = this.props.args;
    if (!src || src.length === 0) {
      return;
    }

    this.setState({ isLoading: true, error: null });

    try {
      const stream = fetchPCMAudio(src, this.abortController.signal);
      const reader = stream.getReader();
      const chunks: ArrayBuffer[] = [];

      // Leer todos los fragmentos del stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        if (value) {
            chunks.push(value);
        }
      }

      if (chunks.length > 0) {
        // Concatenate all WAV fragments
        // Note: Fragments are now in WAV format thanks to createWavFromPCM
        // But the WAV header of each fragment is redundant except for the first one.
        // For simple playback, concatenating the entire WAV files often works,
        // but a more robust approach would be to rebuild a single WAV header.
        // Here we link them directly to simplify.
        const finalBuffer = concatArrayBuffers(...chunks);
        const blob = new Blob([finalBuffer], { type: "audio/wav" });
        const audioSrc = URL.createObjectURL(blob);

        this.setState({ audioSrc, isLoading: false });
      } else {
        this.setState({ isLoading: false, error: "No audio data was received." });
      }
    } catch (error: any) {
        console.error(error);
        this.setState({ error: `Audio processing failed: ${error.message}`, isLoading: false });
    } finally {
        // Adjust the frame height after rendering
        Streamlit.setFrameHeight();
    }
  };

  public render = (): ReactNode => {
    const { audioSrc, isLoading, error } = this.state;

    if (isLoading) {
      return <div>Loading and processing audio...</div>;
    }

    if (error) {
        return <div style={{ color: 'red' }}>Error: {error}</div>;
    }

    if (audioSrc) {
      return (
        <div>
          <audio controls src={audioSrc}>
            Your browser does not support the audio element.
          </audio>
        </div>
      );
    }

    return <div>Provide URLs to play audio.</div>
  }
}

const StreamlitPCMPlayer =  withStreamlitConnection(PcmAudioPlayer);

ReactDOM.render(
    <React.StrictMode>
        <StreamlitPCMPlayer />
    </React.StrictMode>,
    document.getElementById("root")
)