Part 1: lbl-website
Files created/modified:

export-download-urls.ts - New script that queries products and outputs JSON
package.json - Added export-download-urls npm script
Usage:


cd lbl-website
# export download urls
npm run export-download-urls 
Creates > ../calendar-generator-py/download_urls.json

Part 2: calendar-generator-py

cd calendar-generator-py

# Generate all years/themes/languages
python cli/generate_download_links.py

# Filter by year
python cli/generate_download_links.py --year 2026

# Filter by theme and language
python cli/generate_download_links.py --theme dark_mode_blue --language en

# Preview what would be generated
python cli/generate_download_links.py --dry-run
Output:


output/download_links/{year}/{language}/{theme}/download_link.pdf


Both scripts now work with the shared FILES_PATH environment variable. Here's how it works on remote:

Workflow:

lbl-website exports the JSON:


npm run export-download-urls -- --output auto
# Writes to: $FILES_PATH/download_urls.json
calendar-generator-py generates PDFs:


python cli/generate_download_links.py
# Reads from: $FILES_PATH/download_urls.json
# Writes to: $FILES_PATH/download_links/{year}/{language}/{theme}/download_link.pdf
Behavior summary:

Environment	Input source	Output destination
FILES_PATH set	$FILES_PATH/download_urls.json	$FILES_PATH/download_links/...
FILES_PATH not set	./download_urls.json	./output/download_links/...
Both scripts still support explicit paths via --input/--output flags if you need to override the defaults.