# What is FPFool?
_FPFool_ is a Google Chrome browser extension which performs camouflage strategies to protect
users against browser fingerprinting. Browser fingerprinting is a web tracking technique
performed by websites to collect personal data from their visitors.

Different from other fingerprinting protection tools, FPFool does not try to detain websites
from generating a fingerprint of their visitors. Instead, FPFool tries to disguise the
interest profile of the user by performing fake actions on websites which were originally
visited by the user.

# How to use FPFool
**Important:** Before using FPFool, please note that this software is part of a bachelor
thesis and therefore in pre-alpha state. It cannot be ruled out that there are no bugs, so
do not expect everything to work perfectly.

## Installation
To manually install this application, download the `.zip` file of this repository and unzip it.
Afterwards, navigate to `chrome://extensions/` in your Google Chrome webbrowser. Activate the
'developer mode' checkbox and click on 'Load unpacked extension'. Now, select the folder
containing the source code of this repository and you are ready to go.

## Usage
After the installation was successful, FPFool works automatically in the background every time
you use your Google Chrome browser (given that the extension is activated). There are no additional
steps needed. If you wish, you can customize the application by clicking on the extension icon in
your toolbar (next to the url search bar). If you do so, a settings page will appear which allows
you to adjust some parameters of this tool.

# More about the implementation
## Dependencies
This project uses [Bootstrap](https://getbootstrap.com/) as well as [jQuery](https://jquery.com/)
to make things simpler. More dependencies are not existent.

## Documentation
An auto-generated JSDoc documentation can be found [here](https://malte311.github.io/FPFool/).
This repository employs [Travis CI](https://travis-ci.com/) to generate the documentation automatically
and upload it on the `gh-pages` branch every time there is a commit to the `master` branch.

## License
This project is licensed under the [MIT License](https://github.com/Malte311/FPFool/blob/master/LICENSE).

## Lines of code

|Language                     |files          |blank        |comment           |code|
|-----------------------------|---------------|-------------|------------------|----|
|JavaScript                   |   21          |  217        |    610           |1057|
|HTML                         |    2          |   10        |      1           | 116|
|JSON                         |    2          |    0        |      0           |  84|
|Markdown                     |    1          |    9        |      0           |  45|
|Bourne Shell                 |    2          |   14        |      8           |  40|
|CSS                          |    2          |    4        |      6           |  34|
|YAML                         |    1          |    6        |      0           |  16|
|-                            |-              |-            |-                 |-   |
|SUM:                         |   31          |  260        |    625           |1392|
