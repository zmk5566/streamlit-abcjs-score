import {
  Streamlit,
  StreamlitComponentBase,
  withStreamlitConnection,
} from "streamlit-component-lib"
import React, { ReactNode } from "react"
import * as ABCJS from "abcjs"
import "./abcjs-audio.css"

interface State {
  numClicks: number
}

/**
 * This is a React-based component template. The `render()` function is called
 * automatically when your component should be re-rendered.
 */
class AbcScoreComponent extends StreamlitComponentBase<State> {
  private abcContainer = React.createRef<HTMLDivElement>()
  private audioContainer = React.createRef<HTMLDivElement>()
  private currentNotation = ""
  private synthControl: any = null
  private visualObj: any = null

  public state = { numClicks: 0 }

  private cursorControl = {
    onReady: () => {
    },
    onStart: () => {
      const svg = this.abcContainer.current?.querySelector("svg");
      if (svg) {
        const cursor = document.createElementNS("http://www.w3.org/2000/svg", "line");
        cursor.setAttribute("class", "abcjs-cursor");
        cursor.setAttributeNS(null, 'x1', '0');
        cursor.setAttributeNS(null, 'y1', '0');
        cursor.setAttributeNS(null, 'x2', '0');
        cursor.setAttributeNS(null, 'y2', '0');
        cursor.style.stroke = "red";
        svg.appendChild(cursor);
      }
    },
    beatSubdivisions: 2,
    onBeat: (beatNumber: number, totalBeats: number, totalTime: number) => {
    },
    onEvent: (ev: any) => {
      if (ev.measureStart && ev.left === null)
        return; // this was the second part of a tie across a measure line. Just ignore it.

      const lastSelection = this.abcContainer.current?.querySelectorAll("svg .highlight");
      if (lastSelection) {
        for (let k = 0; k < lastSelection.length; k++)
          lastSelection[k].classList.remove("highlight");
      }

      for (let i = 0; i < ev.elements.length; i++) {
        const note = ev.elements[i];
        for (let j = 0; j < note.length; j++) {
          note[j].classList.add("highlight");
        }
      }

      const cursor = this.abcContainer.current?.querySelector("svg .abcjs-cursor");
      if (cursor) {
        cursor.setAttribute("x1", (ev.left - 2).toString());
        cursor.setAttribute("x2", (ev.left - 2).toString());
        cursor.setAttribute("y1", ev.top.toString());
        cursor.setAttribute("y2", (ev.top + ev.height).toString());
      }
    },
    onFinished: () => {
      const els = this.abcContainer.current?.querySelectorAll("svg .highlight");
      if (els) {
        for (let i = 0; i < els.length; i++) {
          els[i].classList.remove("highlight");
        }
      }
      const cursor = this.abcContainer.current?.querySelector("svg .abcjs-cursor");
      if (cursor) {
        cursor.setAttribute("x1", '0');
        cursor.setAttribute("x2", '0');
        cursor.setAttribute("y1", '0');
        cursor.setAttribute("y2", '0');
      }
    }
  }

  public render = (): ReactNode => {
    // Arguments that are passed to the plugin in Python are accessible
    // via `this.props.args`.
    const notation = this.props.args["notation"]
    const height = this.props.args["height"] || 400
    const width = this.props.args["width"]
    const scale = this.props.args["scale"] || 1.0
    const responsive = this.props.args["responsive"] !== false
    const enableAudio = this.props.args["enable_audio"] !== false

    // Streamlit sends us a theme object via props that we can use to ensure
    // that our component has visuals that match the active theme in a
    // streamlit app.
    const { theme } = this.props
    const style: React.CSSProperties = {}

    // Maintain compatibility with older versions of Streamlit that don't send
    // a theme object.
    if (theme) {
      // Use the theme object to style our component
      style.border = `1px solid ${theme.primaryColor}`
      style.borderRadius = "0.5rem"
      style.padding = "0.5rem"
      style.backgroundColor = theme.backgroundColor
    } else {
      style.border = "1px solid #ddd"
      style.borderRadius = "0.5rem"
      style.padding = "0.5rem"
      style.backgroundColor = "#ffffff"
    }

    // Set dimensions
    if (width) {
      style.width = `${width}px`
    }
    style.height = `${height}px`
    style.overflow = "auto"

    return (
      <div style={style}>
        <div
          ref={this.abcContainer}
          style={{
            width: "100%",
            minHeight: "100%",
          }}
        />
        {enableAudio && (
          <div
            ref={this.audioContainer}
            style={{
              marginTop: "10px",
              width: "100%",
            }}
          />
        )}
      </div>
    )
  }

  /** Component lifecycle methods **/
  public componentDidMount = (): void => {
    this.renderAbc()
    this.initializeSynth()
    // Tell Streamlit we're ready to start receiving data. We won't get our
    // first RENDER_EVENT until we call this function.
    Streamlit.setComponentReady()
  }

  public componentDidUpdate = (): void => {
    this.renderAbc()
  }

  /** Custom methods **/
  private initializeSynth = (): void => {
    const enableAudio = this.props.args["enable_audio"] !== false
    
    if (enableAudio && (ABCJS as any).synth?.supportsAudio()) {
      try {
        this.synthControl = new (ABCJS as any).synth.SynthController();
        if (this.audioContainer.current) {
          this.synthControl.load(this.audioContainer.current, this.cursorControl, {
            displayLoop: true,
            displayRestart: true,
            displayPlay: true,
            displayProgress: true,
            displayWarp: true
          });
        }
      } catch (error) {
        console.warn("Audio synthesis not available:", error);
      }
    } else if (enableAudio && this.audioContainer.current) {
      this.audioContainer.current.innerHTML = "<div style='color: #666; padding: 10px; text-align: center; font-size: 14px;'>Audio playback not supported in this browser.</div>";
    }
  }

  private renderAbc = (): void => {
    const notation = this.props.args["notation"]
    const scale = this.props.args["scale"] || 1.0
    const responsive = this.props.args["responsive"] !== false
    const enableAudio = this.props.args["enable_audio"] !== false

    // Only re-render if notation has changed
    if (notation && notation !== this.currentNotation && this.abcContainer.current) {
      try {
        // Clear previous content
        this.abcContainer.current.innerHTML = ""
        
        // Configure rendering options
        const renderOptions: any = {
          scale: scale,
          staffwidth: responsive ? undefined : 600,
          responsive: responsive ? "resize" : undefined,
          add_classes: enableAudio,
        }

        // Render the ABC notation
        const visualObjs = ABCJS.renderAbc(this.abcContainer.current, notation, renderOptions)
        this.visualObj = visualObjs[0]
        
        this.currentNotation = notation
        
        // Setup synth with the rendered notation
        if (enableAudio && this.synthControl && this.visualObj) {
          this.setupSynthWithNotation()
        }
        
        // Optional: Set component height based on rendered content
        setTimeout(() => {
          if (this.abcContainer.current) {
            const renderedHeight = this.abcContainer.current.scrollHeight
            const audioHeight = this.audioContainer.current?.scrollHeight || 0
            const totalHeight = renderedHeight + audioHeight + 40
            Streamlit.setFrameHeight(Math.max(totalHeight, this.props.args["height"] || 400))
          }
        }, 100)
        
      } catch (error) {
        console.error("Error rendering ABC notation:", error)
        if (this.abcContainer.current) {
          this.abcContainer.current.innerHTML = `
            <div style="color: red; padding: 10px; text-align: center;">
              <strong>Error rendering ABC notation:</strong><br/>
              ${error instanceof Error ? error.message : 'Unknown error'}
            </div>
          `
        }
      }
    }
  }

  private setupSynthWithNotation = (): void => {
    if (!this.visualObj || !this.synthControl) return;

    try {
      this.synthControl.disable(true);
      
      const midiBuffer = new (ABCJS as any).synth.CreateSynth();
      midiBuffer.init({
        visualObj: this.visualObj,
      }).then((response: any) => {
        console.log("MIDI buffer created:", response);
        if (this.synthControl) {
          this.synthControl.setTune(this.visualObj, false).then((response: any) => {
            console.log("Audio successfully loaded.");
          }).catch((error: any) => {
            console.warn("Audio problem:", error);
          });
        }
      }).catch((error: any) => {
        console.warn("Audio problem:", error);
      });
    } catch (error) {
      console.warn("Error setting up synth:", error);
    }
  }
}

// "withStreamlitConnection" is a wrapper function. It bootstraps the
// connection between your component and the Streamlit app, and handles
// passing arguments from Python -> Component.
//
// You don't need to edit withStreamlitConnection (but you're welcome to!).
export default withStreamlitConnection(AbcScoreComponent)
