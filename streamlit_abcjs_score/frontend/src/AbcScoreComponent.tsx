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
  private pendingAudioUpdate = false

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
    style.overflow = "inherit"

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
    console.log("🎵 AbcScoreComponent: componentDidMount started")
    // Initialize synth first, then render ABC, then connect them
    this.initializeSynth()
    this.renderAbc()
    // Tell Streamlit we're ready to start receiving data. We won't get our
    // first RENDER_EVENT until we call this function.
    Streamlit.setComponentReady()
    console.log("🎵 AbcScoreComponent: componentDidMount completed")
  }

  public componentDidUpdate = (): void => {
    console.log("🎵 componentDidUpdate: Starting update process")
    const newNotation = this.props.args["notation"]
    const enableAudio = this.props.args["enable_audio"] !== false
    
    console.log("🎵 componentDidUpdate: newNotation =", newNotation?.substring(0, 50) + "...")
    console.log("🎵 componentDidUpdate: currentNotation =", this.currentNotation?.substring(0, 50) + "...")
    console.log("🎵 componentDidUpdate: enableAudio =", enableAudio)
    
    // Check if notation will change and mark for audio update
    if (newNotation !== this.currentNotation && enableAudio) {
      console.log("🎵 componentDidUpdate: Notation will change, marking for audio update")
      this.pendingAudioUpdate = true
    }
    
    // Always render ABC (it has its own change detection)
    
    // Check if we need to update audio after render
    if (this.pendingAudioUpdate && enableAudio) {
      console.log("🎵 componentDidUpdate: Processing pending audio update")
      setTimeout(() => {
        this.connectSynthAndNotation()
        this.pendingAudioUpdate = false
      }, 100)
    }
  }

  /** Custom methods **/
  private initializeSynth = (): void => {
    console.log("🎵 initializeSynth: Starting synth initialization")
    const enableAudio = this.props.args["enable_audio"] !== false
    console.log("🎵 initializeSynth: enableAudio =", enableAudio)
    
    // Check ABCJS availability
    console.log("🎵 initializeSynth: ABCJS object =", ABCJS)
    console.log("🎵 initializeSynth: ABCJS.synth =", (ABCJS as any).synth)
    console.log("🎵 initializeSynth: supportsAudio =", (ABCJS as any).synth?.supportsAudio())
    console.log("🎵 initializeSynth: audioContainer.current =", this.audioContainer.current)
    
    if (enableAudio && (ABCJS as any).synth?.supportsAudio()) {
      console.log("🎵 initializeSynth: Audio is supported, creating SynthController")
      try {
        this.synthControl = new (ABCJS as any).synth.SynthController();
        console.log("🎵 initializeSynth: SynthController created =", this.synthControl)
        
        if (this.audioContainer.current) {
          console.log("🎵 initializeSynth: Loading synth controls into container")
          this.synthControl.load(this.audioContainer.current, this.cursorControl, {
            displayLoop: true,
            displayRestart: true,
            displayPlay: true,
            displayProgress: true,
            displayWarp: true
          });
          console.log("🎵 initializeSynth: Synth controls loaded successfully")
          
          // Check if controls were actually created
          setTimeout(() => {
            const buttons = this.audioContainer.current?.querySelectorAll('button, .abcjs-btn');
            console.log("🎵 initializeSynth: Found audio buttons =", buttons?.length, buttons);
          }, 100);
        } else {
          console.error("🎵 initializeSynth: audioContainer.current is null!")
        }
      } catch (error) {
        console.error("🎵 initializeSynth: Error creating synth:", error);
      }
    } else {
      console.log("🎵 initializeSynth: Audio not supported or disabled")
      if (enableAudio && this.audioContainer.current) {
        this.audioContainer.current.innerHTML = "<div style='color: #666; padding: 10px; text-align: center; font-size: 14px;'>Audio playback not supported in this browser.</div>";
      }
    }
    console.log("🎵 initializeSynth: Synth initialization completed")
  }

  private renderAbc = (): void => {
    console.log("🎵 renderAbc: Starting ABC rendering")
    const notation = this.props.args["notation"]
    const scale = this.props.args["scale"] || 1.0
    const responsive = this.props.args["responsive"] !== false
    const enableAudio = this.props.args["enable_audio"] !== false

    console.log("🎵 renderAbc: notation =", notation?.substring(0, 50) + "...")
    console.log("🎵 renderAbc: enableAudio =", enableAudio)
    console.log("🎵 renderAbc: currentNotation =", this.currentNotation?.substring(0, 50) + "...")
    console.log("🎵 renderAbc: abcContainer.current =", this.abcContainer.current)

    // Only re-render if notation has changed
    if (notation && notation !== this.currentNotation && this.abcContainer.current) {
      console.log("🎵 renderAbc: Notation changed, re-rendering")
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
        console.log("🎵 renderAbc: renderOptions =", renderOptions)

        // Render the ABC notation
        const visualObjs = ABCJS.renderAbc(this.abcContainer.current, notation, renderOptions)
        this.visualObj = visualObjs[0]
        console.log("🎵 renderAbc: visualObjs =", visualObjs)
        console.log("🎵 renderAbc: visualObj =", this.visualObj)
        
        this.currentNotation = notation
        
        // Setup synth with the rendered notation
        console.log("🎵 renderAbc: Checking synth setup conditions:")
        console.log("🎵 renderAbc: enableAudio =", enableAudio)
        console.log("🎵 renderAbc: synthControl =", this.synthControl)
        console.log("🎵 renderAbc: visualObj =", this.visualObj)
        
        // Always try to connect synth after rendering, regardless of current state
        if (enableAudio) {
          console.log("🎵 renderAbc: Attempting to connect synth and notation")
          this.connectSynthAndNotation()
        }
        
        // Optional: Set component height based on rendered content
        setTimeout(() => {
          if (this.abcContainer.current) {
            const renderedHeight = this.abcContainer.current.scrollHeight
            const audioHeight = this.audioContainer.current?.scrollHeight || 0
            const totalHeight = renderedHeight + audioHeight + 40
            console.log("🎵 renderAbc: Setting frame height to", totalHeight)
            Streamlit.setFrameHeight(Math.max(totalHeight, this.props.args["height"] || 400))
          }
        }, 100)
        
      } catch (error) {
        console.error("🎵 renderAbc: Error rendering ABC notation:", error)
        if (this.abcContainer.current) {
          this.abcContainer.current.innerHTML = `
            <div style="color: red; padding: 10px; text-align: center;">
              <strong>Error rendering ABC notation:</strong><br/>
              ${error instanceof Error ? error.message : 'Unknown error'}
            </div>
          `
        }
      }
    } else {
      console.log("🎵 renderAbc: Skipping render - notation unchanged or container missing")
    }
  }

  private connectSynthAndNotation = (): void => {
    console.log("🎵 connectSynthAndNotation: Attempting to connect synth and notation")
    console.log("🎵 connectSynthAndNotation: synthControl =", this.synthControl)
    console.log("🎵 connectSynthAndNotation: visualObj =", this.visualObj)
    
    if (this.synthControl && this.visualObj) {
      console.log("🎵 connectSynthAndNotation: Both components ready, setting up connection")
      this.setupSynthWithNotation()
    } else {
      console.log("🎵 connectSynthAndNotation: Components not ready yet, will retry")
      // Retry after a short delay to allow for async initialization
      setTimeout(() => {
        if (this.synthControl && this.visualObj) {
          console.log("🎵 connectSynthAndNotation: Retry successful, setting up connection")
          this.setupSynthWithNotation()
        } else {
          console.log("🎵 connectSynthAndNotation: Retry failed - components still not ready")
          console.log("🎵 connectSynthAndNotation: synthControl =", this.synthControl)
          console.log("🎵 connectSynthAndNotation: visualObj =", this.visualObj)
        }
      }, 200)
    }
  }

  private setupSynthWithNotation = (): void => {
    console.log("🎵 setupSynthWithNotation: Starting synth setup")
    console.log("🎵 setupSynthWithNotation: visualObj =", this.visualObj)
    console.log("🎵 setupSynthWithNotation: synthControl =", this.synthControl)
    
    if (!this.visualObj || !this.synthControl) {
      console.error("🎵 setupSynthWithNotation: Missing required objects - aborting")
      return;
    }

    try {
      console.log("🎵 setupSynthWithNotation: Disabling synth control")
      this.synthControl.disable(true);
      
      console.log("🎵 setupSynthWithNotation: Creating MIDI buffer")
      const midiBuffer = new (ABCJS as any).synth.CreateSynth();
      console.log("🎵 setupSynthWithNotation: MIDI buffer created =", midiBuffer)
      
      midiBuffer.init({
        visualObj: this.visualObj,
      }).then((response: any) => {
        console.log("🎵 setupSynthWithNotation: MIDI buffer initialized:", response);
        if (this.synthControl) {
          console.log("🎵 setupSynthWithNotation: Setting tune on synth control")
          this.synthControl.setTune(this.visualObj, false).then((response: any) => {
            console.log("🎵 setupSynthWithNotation: Audio successfully loaded:", response);
            console.log("🎵 setupSynthWithNotation: Enabling synth control")
            this.synthControl.disable(false);
            
            // Check if play button is now functional
            setTimeout(() => {
              const playButton = this.audioContainer.current?.querySelector('.abcjs-midi-start');
              console.log("🎵 setupSynthWithNotation: Play button found =", playButton);
              if (playButton) {
                console.log("🎵 setupSynthWithNotation: Play button classes =", playButton.className);
                console.log("🎵 setupSynthWithNotation: Play button disabled =", (playButton as any).disabled);
              }
            }, 100);
          }).catch((error: any) => {
            console.error("🎵 setupSynthWithNotation: Audio setup problem:", error);
          });
        }
      }).catch((error: any) => {
        console.error("🎵 setupSynthWithNotation: MIDI buffer init problem:", error);
      });
    } catch (error) {
      console.error("🎵 setupSynthWithNotation: Error setting up synth:", error);
    }
  }
}

// "withStreamlitConnection" is a wrapper function. It bootstraps the
// connection between your component and the Streamlit app, and handles
// passing arguments from Python -> Component.
//
// You don't need to edit withStreamlitConnection (but you're welcome to!).
export default withStreamlitConnection(AbcScoreComponent)
