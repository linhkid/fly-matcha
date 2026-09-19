# fly-matcha. `make check` must be green at the end of every slice.
PY := .venv/bin/python

.PHONY: venv check test data-guard census

venv:            ## create the environment; installing packages is a download and needs the user's yes
	python3 -m venv .venv
	$(PY) -m pip install --disable-pip-version-check -r lab/requirements.txt
	echo "../../../../lab" > "$$($(PY) -c 'import site; print(site.getsitepackages()[0])')/flylab.pth"  # relative to site-packages: survives renaming the folder

check: test data-guard

test:
	$(PY) -m pytest lab/tests -q

data-guard:      ## raw data never enters the repository (spec rule 8)
	@git check-ignore -q data/raw/probe || (echo "data/raw is not ignored" && exit 1)
	@git check-ignore -q data/built/full/probe || (echo "data/built/full is not ignored" && exit 1)
	@test -z "$$(git ls-files data/raw data/built/full)" || (echo "raw data is tracked" && exit 1)
	@echo "data guard ok"

census:          ## needs the stage A files: python -m flylab data fetch --stage A --yes
	$(PY) -m flylab census taste
