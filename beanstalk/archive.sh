#!/bin/bash

MESSAGE=${1:-"tmp commit"}

rm -rf .git
git init
git add .
git commit -m "${MESSAGE}"
git archive -v -o artifact.zip --format=zip HEAD
rm -rf .git