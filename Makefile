PYTHON ?= python3
PORT ?= 8081

.DEFAULT_GOAL := help

.PHONY: help check serve

help:
	@echo "Model Config Page commands:"
	@echo "  make check  Validate static asset files"
	@echo "  make serve  Serve locally with python http.server"

check:
	@test -f index.html
	@test -f model-config.css
	@test -f model-config.js
	@test -f api-contract.md
	@test -f README.md

serve:
	$(PYTHON) -m http.server $(PORT)
