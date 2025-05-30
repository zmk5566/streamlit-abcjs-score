import {
  Streamlit,
  StreamlitComponentBase,
  withStreamlitConnection,
} from "streamlit-component-lib"
import React, { ReactNode } from "react"
import * as ABCJS from "abcjs"

interface State {
  numClicks: number
}

/**
 * This is a React-based component template. The `render()` function is called
 * automatically when your component should be re-rendered.
 */
class AbcScoreComponent extends StreamlitComponentBase<State> {
  private abcContainer = React.createRef<HTMLDivElement>()
  private currentNotation = ""

  public state = { numClicks: 0 }

  public render = (): ReactNode => {
    // Arguments that are passed to the plugin in Python are accessible
    // via `this.props.args`.
    const notation = this.props.args["notation"]
    const height = this.props.args["height"] || 400
    const width = this.props.args["width"]
    const scale = this.props.args["scale"] || 1.0
    const responsive = this.props.args["responsive"] !== false

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
      </div>
    )
  }

  /** Component lifecycle methods **/
  public componentDidMount = (): void => {
    this.renderAbc()
    // Tell Streamlit we're ready to start receiving data. We won't get our
    // first RENDER_EVENT until we call this function.
    Streamlit.setComponentReady()
  }

  public componentDidUpdate = (): void => {
    this.renderAbc()
  }

  /** Custom methods **/
  private renderAbc = (): void => {
    const notation = this.props.args["notation"]
    const scale = this.props.args["scale"] || 1.0
    const responsive = this.props.args["responsive"] !== false

    // Only re-render if notation has changed
    if (notation && notation !== this.currentNotation && this.abcContainer.current) {
      try {
        // Clear previous content
        this.abcContainer.current.innerHTML = ""
        
        // Configure rendering options
        const renderOptions = {
          scale: scale,
          staffwidth: responsive ? undefined : 600,
          responsive: responsive ? "resize" : undefined,
        }

        // Render the ABC notation
        ABCJS.renderAbc(this.abcContainer.current, notation, renderOptions)
        
        this.currentNotation = notation
        
        // Optional: Set component height based on rendered content
        setTimeout(() => {
          if (this.abcContainer.current) {
            const renderedHeight = this.abcContainer.current.scrollHeight
            Streamlit.setFrameHeight(Math.max(renderedHeight + 20, this.props.args["height"] || 400))
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
}

// "withStreamlitConnection" is a wrapper function. It bootstraps the
// connection between your component and the Streamlit app, and handles
// passing arguments from Python -> Component.
//
// You don't need to edit withStreamlitConnection (but you're welcome to!).
export default withStreamlitConnection(AbcScoreComponent)
