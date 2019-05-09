#!/bin/bash

# Counts lines of code and saves the result (in markdown format) to the readme.md file.
# Requires nodejs with npm.

# Search for cloc installation
CLOC=$(npm list -g | grep cloc)

# If the string has length 0, cloc is not installed
if [ ${#CLOC} == "0" ]; then
	npm install -g cloc
fi

# Write results into temporary file
cloc ./ > result.txt

# Parse the result for markdown format
node github.js result.txt

# Remove temporary file again
rm result.txt

# Git version control
git add .
git status
while true; do
	read -p "Really commit? (y/n)" yn
	case $yn in
		[Yy]* ) git commit -m"$1"
				git push gh master
				break;;
		[Nn]* ) break;;
			* ) echo "Really commit? (y/n)";;
	esac
done