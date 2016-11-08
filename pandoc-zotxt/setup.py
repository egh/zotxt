from setuptools import setup, find_packages

setup(name='pandoc-zotxt',
      version="0.1.35",
      description="Pandoc filter for interacting with Zotero via zotxt.",
      classifiers=[
          "Operating System :: OS Independent",
          "Programming Language :: Python",
      ],
      author='Erik Hetzner',
      author_email='egh@e6h.org',
      url='https://gitlab.com/egh/zotxt',
      packages=find_packages(exclude=[
          'tests']),
      entry_points={
          'console_scripts': [
              'pandoc-zotxt = pandoczotxt:run'
          ]
      },
      install_requires=[
          "pandocfilters",
      ],
      test_suite='tests',
      )
