# 🌍 Population Pyramid Generator

A powerful and interactive Streamlit application for generating population pyramids from UN World Population Prospects data. Create beautiful visualizations with support for multiple countries, years.

![Python](https://img.shields.io/badge/python-3.8+-blue.svg)
![Streamlit](https://img.shields.io/badge/streamlit-1.28+-red.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Features

- 📊 **Multiple Pyramids**: Generate up to 6 population pyramids simultaneously
- 📈 **Interactive Visualizations**: Toggle value labels and data tables
- 🎨 **Smart Layout**: Automatic grid arrangement (3 pyramids per row)
- 💾 **Export Functionality**: Download pyramids as high-quality PNG images
- 🔍 **Full-View Mode**: Expandable view with detailed data tables
- ⚡ **Performance Optimized**: Async data processing prevents UI freezing
- 🎯 **Flexible Selection**: Compare different countries or same country across different years

## 🖼️ Screenshots

### Main Interface
- Upload male and female population data
- Select multiple countries and years
- Configure display options

### Generated Pyramids
- Clean, professional visualizations
- Color-coded male (blue) and female (red) populations
- Total population statistics overlay

### Data Tables
- Detailed numerical breakdown
- Age group analysis
- Easy-to-read formatting

## 📋 Requirements

```txt
streamlit>=1.28.0
pandas>=2.0.0
matplotlib>=3.7.0
numpy>=1.24.0
openpyxl>=3.1.0
```

## 🚀 Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/population-pyramid-generator.git
cd population-pyramid-generator
```

2. **Install dependencies**
```bash
pip install -r requirements.txt
```

3. **Run the application**
```bash
streamlit run pop_pyramid_streamlit.py
```

The app will open automatically in your default browser at `http://localhost:8501`

## 📊 Data Format

The application expects UN World Population Prospects 2024 format Excel files:

### Required Files
- **Male Population Data**: `WPP2024_POP_F02_2_POPULATION_5-YEAR_AGE_GROUPS_MALE.xlsx`
- **Female Population Data**: `WPP2024_POP_F02_3_POPULATION_5-YEAR_AGE_GROUPS_FEMALE.xlsx`

### Data Structure
- Header row starts at row 17 (skiprows=16)
- Required columns:
  - `Region, subregion, country or area *`
  - `Year`
  - Age group columns: `0-4`, `5-9`, `10-14`, ..., `100+`

### Where to Get Data
Download the latest data from [UN World Population Prospects](https://population.un.org/wpp/downloads?folder=Standard%20Projections&group=Population)

## 🎯 Usage

### Step 1: Upload Data Files
1. Click "Upload Male Population Data (XLSX)" and select your male data file
2. Click "Upload Female Population Data (XLSX)" and select your female data file
3. Wait for the success message showing the number of countries and years loaded

### Step 2: Configure Pyramids
1. Select the number of pyramids (1-6) using the number input
2. For each pyramid:
   - Choose a country from the searchable dropdown
   - Select a year from the available years
3. Toggle display options:
   - **Show values on bars**: Display population numbers directly on pyramid bars
   - **Show data tables**: Show detailed numerical data below pyramids

### Step 3: Generate and Download
1. Click "🎨 Generate Pyramids" button
2. Wait for processing (progress bar shown)
3. View pyramids in grid layout
4. Click on any pyramid to expand full view with data table
5. Download individual pyramids as PNG files


## 🎨 Customization

### Modifying Colors
Edit the `create_population_pyramid()` function:
```python
# Male color (currently blue)
color='#3498db'

# Female color (currently red)
color='#e74c3c'
```

### Adjusting Chart Size
Modify the figure size in `create_population_pyramid()`:
```python
fig, ax = plt.subplots(figsize=(12, 8))  # width, height in inches
```

## 🔧 Troubleshooting

### Issue: UI Freezes When Selecting Countries
**Solution**: Make sure you're clicking "Generate Pyramids" button. Country/year selection doesn't process data until you click the button.

### Issue: "No data found" Warning
**Solution**: Verify that:
- The selected country name exactly matches the data
- The selected year is available in the dataset
- Both male and female files contain the data

### Issue: Data Values Show Incorrect Numbers
**Solution**: Ensure your Excel files:
- Have numeric values in age group columns
- Use the correct header row (row 17)
- Follow UN World Population Prospects format

### Issue: Download Button Error
**Solution**: This is fixed in the latest version. Each download button has a unique key.

## 📝 Example Use Cases

1. **Demographic Analysis**: Compare population structures across countries
2. **Historical Trends**: Track how a country's demographics evolved over time
3. **Policy Planning**: Visualize age distribution for resource allocation
4. **Educational Material**: Create teaching materials for demographics courses
5. **Research Publications**: Generate publication-ready population pyramids

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Data source: [UN World Population Prospects 2024](https://population.un.org/wpp/)
- Built with [Streamlit](https://streamlit.io/)
- Visualization powered by [Matplotlib](https://matplotlib.org/)

## 📧 Contact

For questions, suggestions, or issues:
- Open an issue on GitHub
- Contact: grinyakkostya@gmail.com

## 🗺️ Roadmap

- [ ] Add more visualization types (line charts, area charts)
- [ ] Export to PDF with multiple pyramids
- [ ] Comparison mode (overlay two pyramids)
- [ ] Animation feature (show changes over time)
- [ ] More language support (Spanish, French, German)
- [ ] Dark mode theme
- [ ] Custom color schemes
- [ ] API integration for automatic data updates

---