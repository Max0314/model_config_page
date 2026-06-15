PYTHON ?= python3
PORT ?= 8081

.DEFAULT_GOAL := help

.PHONY: help quick check serve

help:
	@echo "Model Config Page commands:"
	@echo "  make quick  Validate static asset files"
	@echo "  make check  Validate static asset files"
	@echo "  make serve  Serve locally with python http.server"

quick:
	@test -f index.html
	@test -f model-config.css
	@test -f model-config.js
	@test -f api-contract.md
	@test -f README.md

check: quick

serve:
	$(PYTHON) -m http.server $(PORT)
