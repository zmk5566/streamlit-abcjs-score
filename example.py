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
    
    # Sidebar for controls
    st.sidebar.header("Controls")
    
    # Example selection
    st.sidebar.subheader("Quick Examples")
    examples = list_examples()
    selected_example = st.sidebar.selectbox(
        "Choose an example:",
        ["Custom"] + examples
    )
    
    # Rendering options
    st.sidebar.subheader("Rendering Options")
    height = st.sidebar.slider("Height (px)", min_value=200, max_value=800, value=400, step=50)
    scale = st.sidebar.slider("Scale", min_value=0.5, max_value=2.0, value=1.0, step=0.1)
    responsive = st.sidebar.checkbox("Responsive", value=True)
    
    # Main content
    col1, col2 = st.columns([1, 1])
    
    with col1:
        st.subheader("ABC Notation Input")
        
        # Set default notation based on selection
        if selected_example == "Custom":
            default_notation = """T: Simple Scale
M: 4/4
L: 1/4
K: C
C D E F | G A B c | c B A G | F E D C |"""
        else:
            default_notation = get_example_notation(selected_example)
        
        # Text area for ABC notation
        notation = st.text_area(
            "Enter your ABC notation:",
            value=default_notation,
            height=300,
            help="Enter ABC notation here. See http://abcnotation.com/ for syntax reference."
        )
        
        
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
                # Render the ABC notation
                abc_score(
                    notation=notation,
                    height=height,
                    scale=scale,
                    responsive=responsive,
                    key="abc_renderer"
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
