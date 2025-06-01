import streamlit as st
from streamlit_abcjs_score import abc_score, get_example_notation, list_examples

def main():
    st.set_page_config(
        page_title="ABC.js Score Renderer",
        page_icon="🎵",
        layout="wide"
    )
    
    st.title("🎵 ABC.js Score Renderer for Streamlit")
    st.markdown("This component renders ABC notation as beautiful sheet music using the abc.js library.")
    
    # Initialize session state for tracking example changes
    if 'current_example' not in st.session_state:
        st.session_state.current_example = "Custom"
    if 'notation_text' not in st.session_state:
        st.session_state.notation_text = """T: Simple Scale
M: 4/4
L: 1/4
K: C
C D E F | G A B c | c B A G | F E D C |"""
    
    # Sidebar for controls
    st.sidebar.header("Controls")
    
    # Example selection
    st.sidebar.subheader("Quick Examples")
    examples = list_examples()
    selected_example = st.sidebar.selectbox(
        "Choose an example:",
        ["Custom"] + examples,
        key="example_selector"
    )
    
    # Check if example selection has changed
    if selected_example != st.session_state.current_example:
        st.session_state.current_example = selected_example
        # Update notation text based on selection
        if selected_example == "Custom":
            st.session_state.notation_text = """T: Simple Scale
M: 4/4
L: 1/4
K: C
C D E F | G A B c | c B A G | F E D C |"""
        else:
            st.session_state.notation_text = get_example_notation(selected_example)
        # Trigger rerun to refresh the component
        st.rerun()
    
    # Rendering options
    st.sidebar.subheader("Rendering Options")
    height = st.sidebar.slider("Height (px)", min_value=200, max_value=800, value=400, step=50)
    scale = st.sidebar.slider("Scale", min_value=0.5, max_value=2.0, value=1.0, step=0.1)
    responsive = st.sidebar.checkbox("Responsive", value=True)
    
    # Main content
    col1, col2 = st.columns([1, 1])
    
    with col1:
        st.subheader("ABC Notation Input")
        
        # Text area for ABC notation - use session state value
        notation = st.text_area(
            "Enter your ABC notation:",
            value=st.session_state.notation_text,
            height=300,
            help="Enter ABC notation here. See http://abcnotation.com/ for syntax reference.",
            key="notation_input"
        )
        
        # Update session state when user manually edits the text
        if notation != st.session_state.notation_text:
            st.session_state.notation_text = notation
        
        # Information about ABC notation
        with st.expander("ℹ️ About ABC Notation"):
            st.markdown("""
            ABC notation is a shorthand form of musical notation. Here are some basics:
            
            - **T:** Title
            - **M:** Meter (time signature)
            - **L:** Default note length
            - **K:** Key signature
            - **|** Bar lines
            - **Notes:** A, B, C, D, E, F, G (lowercase for higher octave)
            - **Rests:** z
            - **Accidentals:** ^ (sharp), _ (flat), = (natural)
            
            Example:
            ```
            T: Mary Had a Little Lamb
            M: 4/4
            L: 1/4
            K: C
            E D C D | E E E2 | D D D2 | E G G2 |
            ```
            """)
    
    with col2:
        st.subheader("Rendered Sheet Music")
        
        if notation.strip():
            try:
                # Use a unique key that includes the example name to force component refresh
                component_key = f"abc_renderer_{st.session_state.current_example}_{hash(notation) % 10000}"
                
                # Render the ABC notation
                abc_score(
                    notation=notation,
                    height=height,
                    scale=scale,
                    responsive=responsive,
                    key=component_key
                )
            except Exception as e:
                st.error(f"Error rendering notation: {str(e)}")
        else:
            st.info("Enter some ABC notation to see the rendered sheet music.")
    
    # Additional information
    st.markdown("---")
    st.subheader("About this component")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.markdown("""
        **Features:**
        - Real-time ABC notation rendering
        - Responsive design
        - Customizable scale and dimensions
        - Error handling
        - Built-in examples
        """)
    
    with col2:
        st.markdown("""
        **Powered by:**
        - [abc.js](https://abcjs.net/) - JavaScript library for ABC notation
        - [Streamlit](https://streamlit.io/) - Python web app framework
        - React - Frontend component framework
        """)
    
    with col3:
        st.markdown("""
        **Resources:**
        - [ABC Notation Standard](http://abcnotation.com/)
        - [ABC.js Documentation](https://abcjs.net/abcjs-editor.html)
        - [Component Source Code](https://github.com/yourusername/streamlit-abcjs-score)
        """)

if __name__ == "__main__":
    main()
