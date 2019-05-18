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
node cloc.js result.txt

# Remove temporary file again
rm result.txt

# Git version control
GH=$(git remote | grep gh) # Github
BB=$(git remote | grep bb) # Bitbucket
GL=$(git remote | grep gl) # Gitlab

if [ ${#GH} == "0" ]; then
	git remote add gh git@github.com:Malte311/FPFool.git
	echo "Added gh remote."
fi

if [ ${#BB} == "0" ]; then
	git remote add bb git@bitbucket.org:malte311/fpfool.git
	echo "Added bb remote."
fi

if [ ${#GL} == "0" ]; then
	git remote add gl git@gitlab.com:Malte311/fpfool.git
	echo "Added gl remote."
fi

git add .
git status

read -p "Type in commit message." cm

while true; do
	read -p "Really commit (y/n)? Your commit message is: $cm" yn
	case $yn in
		[Yy]* ) git commit -m"$cm"
				git push gh master
				git push bb master
				git push gl master
				break;;
		[Nn]* ) break;;
			* ) echo "Really commit (y/n)?";;
	esac
done