# Always prefer setuptools over distutils
from setuptools import setup, find_packages
# To use a consistent encoding
from codecs import open
from os import path

here = path.abspath(path.dirname(__file__))

# Get the long description from the README file
with open(path.join(here, 'README.rst'), encoding='utf-8') as f:
    long_description = f.read()

setup(
    name='pandoc-zotxt',
    version='0.1.35',
    description='Pandoc filter for interacting with Zotero via zotxt.',
    long_description=long_description,
    classifiers=[
        'Development Status :: 5 - Production/Stable',
        'Operating System :: OS Independent',
        'Programming Language :: Python :: 2.7',
    ],
    author='Erik Hetzner',
    author_email='egh@e6h.org',
    url='https://gitlab.com/egh/zotxt',
    packages=find_packages(exclude=['contrib', 'docs', 'tests']),
    entry_points={
        'console_scripts': [
            'pandoc-zotxt = pandoczotxt:run'
        ]
    },
    install_requires=['pandocfilters'],
    test_suite='tests',
    license='GPLv3'
)
