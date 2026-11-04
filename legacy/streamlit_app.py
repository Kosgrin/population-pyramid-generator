import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt
import io
from matplotlib.backends.backend_agg import FigureCanvasAgg
import numpy as np

st.set_page_config(page_title="Population Pyramid Generator", layout="wide")

st.title("🌍 Population Pyramid Generator")
st.markdown("Upload male and female population data to create custom population pyramids")

# Initialize session state
if 'male_df' not in st.session_state:
    st.session_state.male_df = None
if 'female_df' not in st.session_state:
    st.session_state.female_df = None
if 'age_cols' not in st.session_state:
    st.session_state.age_cols = None
if 'countries' not in st.session_state:
    st.session_state.countries = []
if 'years' not in st.session_state:
    st.session_state.years = []
if 'generated_pyramids' not in st.session_state:
    st.session_state.generated_pyramids = []
if 'pyramid_selections' not in st.session_state:
    st.session_state.pyramid_selections = []


def load_population_data(file_path, header_row=16):
    """Load and clean population data from uploaded Excel file."""
    df = pd.read_excel(file_path, skiprows=header_row)
    df.columns = df.columns.astype(str).str.strip()
    
    # Detect age group columns
    age_cols = [c for c in df.columns if c.split('-')[0].isdigit() or c.startswith('100')]
    
    return df, age_cols


def create_population_pyramid(male_data, female_data, age_groups, country, year, interactive=False):
    """Create a population pyramid for given country and year."""
    fig, ax = plt.subplots(figsize=(12, 8))
    
    # Prepare data (keep original values in thousands)
    y_pos = np.arange(len(age_groups))
    
    # Male data (negative for left side, already in thousands)
    male_values = -male_data.values / 1000  # Convert to thousands and make negative
    female_values = female_data.values / 1000  # Convert to thousands
    
    # Create horizontal bars
    bars_male = ax.barh(y_pos, male_values, height=0.8, label='Male', color='#3498db', alpha=0.8)
    bars_female = ax.barh(y_pos, female_values, height=0.8, label='Female', color='#e74c3c', alpha=0.8)
    
    # Add value labels on bars if interactive mode
    if interactive:
        for i, (bar_m, bar_f) in enumerate(zip(bars_male, bars_female)):
            # Male labels (on left side)
            male_val = abs(male_values[i])
            if male_val > 0:
                ax.text(male_values[i] * 0.5, i, 
                       f'{male_val:.1f}k', ha='center', va='center', fontsize=7, color='white', fontweight='bold')
            
            # Female labels (on right side)
            female_val = female_values[i]
            if female_val > 0:
                ax.text(female_values[i] * 0.5, i, 
                       f'{female_val:.1f}k', ha='center', va='center', fontsize=7, color='white', fontweight='bold')
    
    # Customize plot
    ax.set_yticks(y_pos)
    ax.set_yticklabels(age_groups, fontsize=10)
    ax.set_xlabel('Population (thousands)', fontsize=12, fontweight='bold')
    ax.set_ylabel('Age Group', fontsize=12, fontweight='bold')
    ax.set_title(f'Population Pyramid: {country} ({year})', fontsize=16, fontweight='bold', pad=20)
    
    # Format x-axis to show absolute values with proper scale
    max_val = max(abs(male_values.min()), female_values.max())
    ax.set_xlim(-max_val * 1.15, max_val * 1.15)
    
    # Custom x-axis labels (absolute values in thousands)
    xticks = ax.get_xticks()
    ax.set_xticklabels([f'{abs(x):.0f}k' if abs(x) >= 1 else f'{abs(x)*1000:.0f}' for x in xticks], fontsize=10)
    
    # Add legend
    ax.legend(loc='upper right', fontsize=11, framealpha=0.9)
    
    # Add grid
    ax.grid(axis='x', alpha=0.3, linestyle='--', linewidth=0.7)
    ax.axvline(x=0, color='black', linewidth=1.2)
    
    # Add total population annotation
    total_male = abs(male_values.sum())
    total_female = female_values.sum()
    total_pop = total_male + total_female
    ax.text(0.02, 0.98, f'Total: {total_pop:.1f}k\nMale: {total_male:.1f}k\nFemale: {total_female:.1f}million',
            transform=ax.transAxes, fontsize=10, verticalalignment='top',
            bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))
    
    plt.tight_layout()
    return fig


def create_data_table(male_data, female_data, age_groups, country, year):
    """Create a summary table for the population data."""
    # Convert to numeric and handle any non-numeric values
    male_vals = pd.to_numeric(male_data, errors='coerce').fillna(0).values
    female_vals = pd.to_numeric(female_data, errors='coerce').fillna(0).values
    
    df = pd.DataFrame({
        'Age Group': age_groups,
        'Male': male_vals,
        'Female': female_vals,
        'Total': male_vals + female_vals
    })
    return df


def fig_to_bytes(fig):
    """Convert matplotlib figure to PNG bytes."""
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=150, bbox_inches='tight')
    buf.seek(0)
    return buf.getvalue()


# === FILE UPLOAD SECTION ===
st.header("📁 Step 1: Upload Data Files")

col1, col2 = st.columns(2)

with col1:
    male_file = st.file_uploader("Upload Male Population Data (XLSX)", type=['xlsx'], key='male')
    
with col2:
    female_file = st.file_uploader("Upload Female Population Data (XLSX)", type=['xlsx'], key='female')

# Process uploaded files
if male_file and female_file:
    # Only process if not already loaded
    if st.session_state.male_df is None or st.session_state.female_df is None:
        try:
            with st.spinner("Loading data..."):
                male_df, male_age_cols = load_population_data(male_file, header_row=16)
                female_df, female_age_cols = load_population_data(female_file, header_row=16)
                
                # Store in session state
                st.session_state.male_df = male_df
                st.session_state.female_df = female_df
                st.session_state.age_cols = male_age_cols
                
                # Get common countries and years
                male_countries = set(male_df["Region, subregion, country or area *"])
                female_countries = set(female_df["Region, subregion, country or area *"])
                common_countries = sorted(list(male_countries & female_countries))
                
                years_male = set(male_df["Year"])
                years_female = set(female_df["Year"])
                common_years = sorted(list(years_male & years_female))
                
                st.session_state.countries = common_countries
                st.session_state.years = common_years
                
                st.success(f"✅ Data loaded successfully! Found {len(common_countries)} countries and {len(common_years)} years.")
                
        except Exception as e:
            st.error(f"❌ Error loading files: {str(e)}")

# === PYRAMID CONFIGURATION SECTION ===
if st.session_state.male_df is not None and st.session_state.female_df is not None:
    st.header("📊 Step 2: Configure Population Pyramids")
    st.markdown("Select up to 6 country/year combinations to generate pyramids")
    
    # Number of pyramids selector
    num_pyramids = st.number_input("Number of pyramids to generate", min_value=1, max_value=6, value=1, step=1)
    
    # Store selections temporarily (no data processing)
    st.session_state.pyramid_selections = []
    
    cols = st.columns(min(3, num_pyramids))
    for i in range(num_pyramids):
        with cols[i % 3]:
            st.subheader(f"Pyramid {i+1}")
            
            # Simple selection without processing
            country = st.selectbox(
                "Country",
                options=st.session_state.countries,
                key=f"country_{i}",
                help="Start typing to search"
            )
            
            year = st.selectbox(
                "Year",
                options=st.session_state.years,
                key=f"year_{i}"
            )
            
            # Store selection (no data lookup, just store the values)
            st.session_state.pyramid_selections.append({
                'country': country,
                'year': year
            })
    
    # Display options
    st.subheader("Display Options")
    col_opt1, col_opt2 = st.columns(2)
    with col_opt1:
        show_values = st.checkbox("Show values on bars", value=True, help="Display population values directly on pyramid bars")
    with col_opt2:
        show_tables = st.checkbox("Show data tables", value=True, help="Display numerical data table below each pyramid")
    
    # === GENERATE PYRAMIDS ===
    if st.button("🎨 Generate Pyramids", type="primary", use_container_width=True):
        with st.spinner(f"Generating {num_pyramids} pyramids..."):
            st.session_state.generated_pyramids = []
            
            progress_bar = st.progress(0)
            
            for idx, selection in enumerate(st.session_state.pyramid_selections):
                country = selection['country']
                year = selection['year']
                
                # Update progress
                progress_bar.progress((idx + 1) / len(st.session_state.pyramid_selections))
                
                # Get data for selected country and year
                male_row = st.session_state.male_df[
                    (st.session_state.male_df["Region, subregion, country or area *"] == country) & 
                    (st.session_state.male_df["Year"] == year)
                ]
                
                female_row = st.session_state.female_df[
                    (st.session_state.female_df["Region, subregion, country or area *"] == country) & 
                    (st.session_state.female_df["Year"] == year)
                ]
                
                if not male_row.empty and not female_row.empty:
                    male_data = male_row[st.session_state.age_cols].iloc[0]
                    female_data = female_row[st.session_state.age_cols].iloc[0]
                    
                    # Create pyramid
                    fig = create_population_pyramid(
                        male_data, 
                        female_data, 
                        st.session_state.age_cols, 
                        country, 
                        year,
                        interactive=show_values
                    )
                    
                    # Create data table
                    data_table = create_data_table(
                        male_data,
                        female_data,
                        st.session_state.age_cols,
                        country,
                        year
                    )
                    
                    st.session_state.generated_pyramids.append({
                        'fig': fig,
                        'country': country,
                        'year': year,
                        'table': data_table
                    })
                else:
                    st.warning(f"⚠️ No data found for {country}, {year}")
            
            progress_bar.empty()
        
        st.success(f"✅ Generated {len(st.session_state.generated_pyramids)} pyramids!")
    
    # === DISPLAY PYRAMIDS ===
    if st.session_state.generated_pyramids:
        st.header("📈 Generated Population Pyramids")
        
        # Display in grid layout (3 columns per row)
        num_pyramids_generated = len(st.session_state.generated_pyramids)
        
        for row_start in range(0, num_pyramids_generated, 3):
            row_pyramids = st.session_state.generated_pyramids[row_start:row_start + 3]
            cols = st.columns(len(row_pyramids))
            
            for col_idx, pyramid_data in enumerate(row_pyramids):
                with cols[col_idx]:
                    # Small preview
                    st.image(fig_to_bytes(pyramid_data['fig']), use_container_width=True)
                    
                    # Expander for full view
                    with st.expander(f"🔍 View Full: {pyramid_data['country']} ({pyramid_data['year']})"):
                        st.pyplot(pyramid_data['fig'])
                        
                        if show_tables:
                            st.subheader("📋 Population Data (in thousands)")
                            # Format the dataframe for better display
                            styled_table = pyramid_data['table'].style.format({
                                'Male': '{:.3f}',
                                'Female': '{:.3f}',
                                'Total': '{:.3f}'
                            })
                            st.dataframe(styled_table, use_container_width=True, height=400)
        
        # === DOWNLOAD SECTION ===
        st.header("💾 Download Pyramids")
        
        download_cols = st.columns(min(3, num_pyramids_generated))
        
        for idx, pyramid_data in enumerate(st.session_state.generated_pyramids):
            with download_cols[idx % 3]:
                png_bytes = fig_to_bytes(pyramid_data['fig'])
                filename = f"pyramid_{pyramid_data['country'].replace(' ', '_')}_{pyramid_data['year']}.png"
                
                st.download_button(
                    label=f"⬇️ {pyramid_data['country']} ({pyramid_data['year']})",
                    data=png_bytes,
                    file_name=filename,
                    mime="image/png",
                    use_container_width=True,
                    key=f"download_{idx}_{pyramid_data['country']}_{pyramid_data['year']}"  # Unique key
                )

else:
    st.info("👆 Please upload both male and female population data files to begin")

# === FOOTER ===
st.markdown("---")
st.markdown("**Data Source**: UN World Population Prospects 2024")
st.markdown("💡 **Tip**: Click on pyramid previews to view full-size with interactive data tables")