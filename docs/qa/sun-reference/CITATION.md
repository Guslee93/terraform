/docs/qa/sun-reference/generate_reference.py — Independent NREL SPA solar reference generator for Terraform v1.

pvlib: Copyright (c) 2018, pvlib python contributors
       NREL SPA (Solar Position Algorithm) implementation.
       https://pvlib-python.readthedocs.io/
       Version: 0.15.2

Citation:
  William F. Holmgren, Clifford W. Hansen, and Joshua M. Mikofski,
  "pvlib python: a python package for modeling solar energy systems,"
  Journal of Open Source Software, 3(29), 1066, 2018.
  DOI: 10.21105/joss.01066

Algorithm reference:
  Reda, I., and A. Andreas, "Solar Position Algorithm for Solar Radiation
  Applications," NREL Technical Report NREL/TP-560-34302, 2008.
  DOI: 10.2172/15003974

Data files:
  nrel_spa_reference.json — Full output (202 rows)
  nrel_spa_reference.csv — Same data in tabular format

Sites:
  Oslo:    59.9235° N, 10.758° E (Compact Infill origin)
  Tromsø:  69.6492° N, 18.9553° E

Time zone: Europe/Oslo via Python zoneinfo (tzdata 2026.6)
Method: pvlib.solarposition.get_solarposition (nrel_numpy, altitude=pressure=default)