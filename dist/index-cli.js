'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var application = require('./application-23d90d59.js');
var fs = require('fs-extra');
var path = require('path');
var Ast = require('ts-simple-ast');
var Ast__default = _interopDefault(Ast);
require('live-server');
require('lodash');
require('i18next');
require('handlebars');
require('semver');
require('json5');
var cosmiconfig = require('cosmiconfig');

var glob = require('glob');
var ParserUtil = /** @class */ (function () {
    function ParserUtil() {
        this._globFiles = [];
    }
    ParserUtil.prototype.init = function (exclude, cwd) {
        this._files = exclude;
        this._cwd = cwd;
        var i = 0;
        var len = exclude.length;
        for (i; i < len; i++) {
            this._globFiles = this._globFiles.concat(glob.sync(exclude[i], { cwd: this._cwd }));
        }
    };
    ParserUtil.prototype.testFilesWithCwdDepth = function () {
        var i = 0;
        var len = this._files.length;
        var result = {
            status: true,
            level: 0
        };
        for (i; i < len; i++) {
            var elementPath = path.resolve(this._cwd + path.sep, this._files[i]);
            if (elementPath.indexOf(this._cwd) === -1) {
                result.status = false;
                var level = this._files[i].match(/\..\//g).length;
                if (level > result.level) {
                    result.level = level;
                }
            }
        }
        return result;
    };
    ParserUtil.prototype.updateCwd = function (cwd, level) {
        var _cwd = cwd, _rewind = '';
        for (var i = 0; i < level; i++) {
            _rewind += '../';
        }
        _cwd = path.resolve(_cwd, _rewind);
        return _cwd;
    };
    ParserUtil.prototype.testFile = function (file) {
        var _this = this;
        var i = 0;
        var len = this._files.length;
        var fileBasename = path.basename(file);
        var fileNameInCwd = file.replace(this._cwd + path.sep, '');
        var result = false;
        if (path.sep === '\\') {
            fileNameInCwd = fileNameInCwd.replace(new RegExp('\\' + path.sep, 'g'), '/');
        }
        for (i; i < len; i++) {
            if (glob.hasMagic(this._files[i]) && this._globFiles.length > 0) {
                var resultGlobSearch = this._globFiles.findIndex(function (element) {
                    var elementPath = path.resolve(_this._cwd + path.sep, element);
                    var elementPathInCwd = elementPath.replace(_this._cwd + path.sep, '');
                    elementPathInCwd = elementPathInCwd.replace(new RegExp('\\' + path.sep, 'g'), '/');
                    return elementPathInCwd === fileNameInCwd;
                });
                result = resultGlobSearch !== -1;
            }
            else {
                result = fileNameInCwd === this._files[i];
            }
            if (result) {
                break;
            }
        }
        return result;
    };
    return ParserUtil;
}());

var os = require('os');
var osName = require('os-name');
var pkg = require('../package.json');
var program = require('commander');
var cosmiconfigModuleName = 'compodoc';
var scannedFiles = [];
var excludeFiles;
var includeFiles;
var cwd = process.cwd();
process.setMaxListeners(0);
var CliApplication = /** @class */ (function (_super) {
    application.__extends(CliApplication, _super);
    function CliApplication() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /**
     * Run compodoc from the command line.
     */
    CliApplication.prototype.start = function () {
        var _this = this;
        function list(val) {
            return val.split(',');
        }
        program
            .version(pkg.version)
            .usage('<src> [options]')
            .option('-c, --config [config]', 'A configuration file : .compodocrc, .compodocrc.json, .compodocrc.yaml or compodoc property in package.json')
            .option('-p, --tsconfig [config]', 'A tsconfig.json file')
            .option('-d, --output [folder]', 'Where to store the generated documentation', application.COMPODOC_DEFAULTS.folder)
            .option('-y, --extTheme [file]', 'External styling theme file')
            .option('-n, --name [name]', 'Title documentation', application.COMPODOC_DEFAULTS.title)
            .option('-a, --assetsFolder [folder]', 'External assets folder to copy in generated documentation folder')
            .option('-o, --open [value]', 'Open the generated documentation')
            .option('-t, --silent', "In silent mode, log messages aren't logged in the console", false)
            .option('-s, --serve', 'Serve generated documentation (default http://localhost:8080/)', false)
            .option('--host [host]', 'Change default host address')
            .option('-r, --port [port]', 'Change default serving port', application.COMPODOC_DEFAULTS.port)
            .option('-w, --watch', 'Watch source files after serve and force documentation rebuild', false)
            .option('-e, --exportFormat [format]', 'Export in specified format (json, html)', application.COMPODOC_DEFAULTS.exportFormat)
            .option('--files [files]', 'Files provided by external tool, used for coverage test')
            .option('--language [language]', 'Language used for the generated documentation (de-DE, en-US, es-ES, fr-FR, hu-HU, it-IT, ja-JP, nl-NL, pt-BR, sk-SK, zh-CN)', application.COMPODOC_DEFAULTS.language)
            .option('--theme [theme]', "Choose one of available themes, default is 'gitbook' (laravel, original, material, postmark, readthedocs, stripe, vagrant)")
            .option('--hideGenerator', 'Do not print the Compodoc link at the bottom of the page', false)
            .option('--toggleMenuItems <items>', "Close by default items in the menu values : ['all'] or one of these ['modules','components','directives','controllers','classes','injectables','guards','interfaces','interceptors','pipes','miscellaneous','additionalPages']", list, application.COMPODOC_DEFAULTS.toggleMenuItems)
            .option('--navTabConfig <tab configs>', "List navigation tab objects in the desired order with two string properties (\"id\" and \"label\"). Double-quotes must be escaped with '\\'. Available tab IDs are \"info\", \"readme\", \"source\", \"templateData\", \"styleData\", \"tree\", and \"example\". Note: Certain tabs will only be shown if applicable to a given dependency", list, JSON.stringify(application.COMPODOC_DEFAULTS.navTabConfig))
            .option('--templates [folder]', 'Path to directory of Handlebars templates to override built-in templates')
            .option('--includes [path]', 'Path of external markdown files to include')
            .option('--includesName [name]', 'Name of item menu of externals markdown files', application.COMPODOC_DEFAULTS.additionalEntryName)
            .option('--coverageTest [threshold]', 'Test command of documentation coverage with a threshold (default 70)')
            .option('--coverageMinimumPerFile [minimum]', 'Test command of documentation coverage per file with a minimum (default 0)')
            .option('--coverageTestThresholdFail [true|false]', 'Test command of documentation coverage (global or per file) will fail with error or just warn user (true: error, false: warn)', application.COMPODOC_DEFAULTS.coverageTestThresholdFail)
            .option('--coverageTestShowOnlyFailed', 'Display only failed files for a coverage test')
            .option('--unitTestCoverage [json-summary]', 'To include unit test coverage, specify istanbul JSON coverage summary file')
            .option('--disableSourceCode', 'Do not add source code tab and links to source code', false)
            .option('--disableDomTree', 'Do not add dom tree tab', false)
            .option('--disableTemplateTab', 'Do not add template tab', false)
            .option('--disableStyleTab', 'Do not add style tab', false)
            .option('--disableGraph', 'Do not add the dependency graph', false)
            .option('--disableCoverage', 'Do not add the documentation coverage report', false)
            .option('--disablePrivate', 'Do not show private in generated documentation', false)
            .option('--disableProtected', 'Do not show protected in generated documentation', false)
            .option('--disableInternal', 'Do not show @internal in generated documentation', false)
            .option('--disableLifeCycleHooks', 'Do not show Angular lifecycle hooks in generated documentation', false)
            .option('--disableRoutesGraph', 'Do not add the routes graph', application.COMPODOC_DEFAULTS.disableRoutesGraph)
            .option('--disableSearch', 'Do not add the search input', false)
            .option('--disableDependencies', 'Do not add the dependencies list', application.COMPODOC_DEFAULTS.disableDependencies)
            .option('--minimal', 'Minimal mode with only documentation. No search, no graph, no coverage.', false)
            .option('--customFavicon [path]', 'Use a custom favicon')
            .option('--customLogo [path]', 'Use a custom logo')
            .option('--gaID [id]', 'Google Analytics tracking ID')
            .option('--gaSite [site]', 'Google Analytics site name', application.COMPODOC_DEFAULTS.gaSite)
            .option('--maxSearchResults [maxSearchResults]', 'Max search results on the results page. To show all results, set to 0', application.COMPODOC_DEFAULTS.maxSearchResults)
            .parse(process.argv);
        var outputHelp = function () {
            program.outputHelp();
            process.exit(1);
        };
        var configExplorer = cosmiconfig.cosmiconfigSync(cosmiconfigModuleName);
        var configExplorerResult;
        var configFile = {};
        if (program.config) {
            var configFilePath = program.config;
            var testConfigFilePath = configFilePath.match(process.cwd());
            if (testConfigFilePath && testConfigFilePath.length > 0) {
                configFilePath = configFilePath.replace(process.cwd() + path.sep, '');
            }
            configExplorerResult = configExplorer.load(path.resolve(configFilePath));
        }
        else {
            configExplorerResult = configExplorer.search();
        }
        if (configExplorerResult) {
            if (typeof configExplorerResult.config !== 'undefined') {
                configFile = configExplorerResult.config;
            }
        }
        if (configFile.output) {
            application.Configuration.mainData.output = configFile.output;
        }
        if (program.output && program.output !== application.COMPODOC_DEFAULTS.folder) {
            application.Configuration.mainData.output = program.output;
        }
        if (configFile.extTheme) {
            application.Configuration.mainData.extTheme = configFile.extTheme;
        }
        if (program.extTheme) {
            application.Configuration.mainData.extTheme = program.extTheme;
        }
        if (configFile.language) {
            application.Configuration.mainData.language = configFile.language;
        }
        if (program.language) {
            application.Configuration.mainData.language = program.language;
        }
        if (configFile.theme) {
            application.Configuration.mainData.theme = configFile.theme;
        }
        if (program.theme) {
            application.Configuration.mainData.theme = program.theme;
        }
        if (configFile.name) {
            application.Configuration.mainData.documentationMainName = configFile.name;
        }
        if (program.name && program.name !== application.COMPODOC_DEFAULTS.title) {
            application.Configuration.mainData.documentationMainName = program.name;
        }
        if (configFile.assetsFolder) {
            application.Configuration.mainData.assetsFolder = configFile.assetsFolder;
        }
        if (program.assetsFolder) {
            application.Configuration.mainData.assetsFolder = program.assetsFolder;
        }
        if (configFile.open) {
            application.Configuration.mainData.open = configFile.open;
        }
        if (program.open) {
            application.Configuration.mainData.open = program.open;
        }
        if (configFile.toggleMenuItems) {
            application.Configuration.mainData.toggleMenuItems = configFile.toggleMenuItems;
        }
        if (program.toggleMenuItems &&
            program.toggleMenuItems !== application.COMPODOC_DEFAULTS.toggleMenuItems) {
            application.Configuration.mainData.toggleMenuItems = program.toggleMenuItems;
        }
        if (configFile.templates) {
            application.Configuration.mainData.templates = configFile.templates;
        }
        if (program.templates) {
            application.Configuration.mainData.templates = program.templates;
        }
        if (configFile.navTabConfig) {
            application.Configuration.mainData.navTabConfig = configFile.navTabConfig;
        }
        if (program.navTabConfig &&
            JSON.parse(program.navTabConfig).length !== application.COMPODOC_DEFAULTS.navTabConfig.length) {
            application.Configuration.mainData.navTabConfig = JSON.parse(program.navTabConfig);
        }
        if (configFile.includes) {
            application.Configuration.mainData.includes = configFile.includes;
        }
        if (program.includes) {
            application.Configuration.mainData.includes = program.includes;
        }
        if (configFile.includesName) {
            application.Configuration.mainData.includesName = configFile.includesName;
        }
        if (program.includesName &&
            program.includesName !== application.COMPODOC_DEFAULTS.additionalEntryName) {
            application.Configuration.mainData.includesName = program.includesName;
        }
        if (configFile.silent) {
            application.logger.silent = false;
        }
        if (program.silent) {
            application.logger.silent = false;
        }
        if (configFile.serve) {
            application.Configuration.mainData.serve = configFile.serve;
        }
        if (program.serve) {
            application.Configuration.mainData.serve = program.serve;
        }
        if (configFile.host) {
            application.Configuration.mainData.host = configFile.host;
            application.Configuration.mainData.hostname = configFile.host;
        }
        if (program.host) {
            application.Configuration.mainData.host = program.host;
            application.Configuration.mainData.hostname = program.host;
        }
        if (configFile.port) {
            application.Configuration.mainData.port = configFile.port;
        }
        if (program.port && program.port !== application.COMPODOC_DEFAULTS.port) {
            application.Configuration.mainData.port = program.port;
        }
        if (configFile.watch) {
            application.Configuration.mainData.watch = configFile.watch;
        }
        if (program.watch) {
            application.Configuration.mainData.watch = program.watch;
        }
        if (configFile.exportFormat) {
            application.Configuration.mainData.exportFormat = configFile.exportFormat;
        }
        if (program.exportFormat && program.exportFormat !== application.COMPODOC_DEFAULTS.exportFormat) {
            application.Configuration.mainData.exportFormat = program.exportFormat;
        }
        if (configFile.hideGenerator) {
            application.Configuration.mainData.hideGenerator = configFile.hideGenerator;
        }
        if (program.hideGenerator) {
            application.Configuration.mainData.hideGenerator = program.hideGenerator;
        }
        if (configFile.coverageTest) {
            application.Configuration.mainData.coverageTest = true;
            application.Configuration.mainData.coverageTestThreshold =
                typeof configFile.coverageTest === 'string'
                    ? parseInt(configFile.coverageTest, 10)
                    : application.COMPODOC_DEFAULTS.defaultCoverageThreshold;
        }
        if (program.coverageTest) {
            application.Configuration.mainData.coverageTest = true;
            application.Configuration.mainData.coverageTestThreshold =
                typeof program.coverageTest === 'string'
                    ? parseInt(program.coverageTest, 10)
                    : application.COMPODOC_DEFAULTS.defaultCoverageThreshold;
        }
        if (configFile.coverageMinimumPerFile) {
            application.Configuration.mainData.coverageTestPerFile = true;
            application.Configuration.mainData.coverageMinimumPerFile =
                typeof configFile.coverageMinimumPerFile === 'string'
                    ? parseInt(configFile.coverageMinimumPerFile, 10)
                    : application.COMPODOC_DEFAULTS.defaultCoverageMinimumPerFile;
        }
        if (program.coverageMinimumPerFile) {
            application.Configuration.mainData.coverageTestPerFile = true;
            application.Configuration.mainData.coverageMinimumPerFile =
                typeof program.coverageMinimumPerFile === 'string'
                    ? parseInt(program.coverageMinimumPerFile, 10)
                    : application.COMPODOC_DEFAULTS.defaultCoverageMinimumPerFile;
        }
        if (configFile.coverageTestThresholdFail) {
            application.Configuration.mainData.coverageTestThresholdFail =
                configFile.coverageTestThresholdFail === 'false' ? false : true;
        }
        if (program.coverageTestThresholdFail) {
            application.Configuration.mainData.coverageTestThresholdFail =
                program.coverageTestThresholdFail === 'false' ? false : true;
        }
        if (configFile.coverageTestShowOnlyFailed) {
            application.Configuration.mainData.coverageTestShowOnlyFailed =
                configFile.coverageTestShowOnlyFailed;
        }
        if (program.coverageTestShowOnlyFailed) {
            application.Configuration.mainData.coverageTestShowOnlyFailed = program.coverageTestShowOnlyFailed;
        }
        if (configFile.unitTestCoverage) {
            application.Configuration.mainData.unitTestCoverage = configFile.unitTestCoverage;
        }
        if (program.unitTestCoverage) {
            application.Configuration.mainData.unitTestCoverage = program.unitTestCoverage;
        }
        if (configFile.disableSourceCode) {
            application.Configuration.mainData.disableSourceCode = configFile.disableSourceCode;
        }
        if (program.disableSourceCode) {
            application.Configuration.mainData.disableSourceCode = program.disableSourceCode;
        }
        if (configFile.disableDomTree) {
            application.Configuration.mainData.disableDomTree = configFile.disableDomTree;
        }
        if (program.disableDomTree) {
            application.Configuration.mainData.disableDomTree = program.disableDomTree;
        }
        if (configFile.disableTemplateTab) {
            application.Configuration.mainData.disableTemplateTab = configFile.disableTemplateTab;
        }
        if (program.disableTemplateTab) {
            application.Configuration.mainData.disableTemplateTab = program.disableTemplateTab;
        }
        if (configFile.disableStyleTab) {
            application.Configuration.mainData.disableStyleTab = configFile.disableStyleTab;
        }
        if (program.disableStyleTab) {
            application.Configuration.mainData.disableStyleTab = program.disableStyleTab;
        }
        if (configFile.disableGraph) {
            application.Configuration.mainData.disableGraph = configFile.disableGraph;
        }
        if (program.disableGraph) {
            application.Configuration.mainData.disableGraph = program.disableGraph;
        }
        if (configFile.disableCoverage) {
            application.Configuration.mainData.disableCoverage = configFile.disableCoverage;
        }
        if (program.disableCoverage) {
            application.Configuration.mainData.disableCoverage = program.disableCoverage;
        }
        if (configFile.disablePrivate) {
            application.Configuration.mainData.disablePrivate = configFile.disablePrivate;
        }
        if (program.disablePrivate) {
            application.Configuration.mainData.disablePrivate = program.disablePrivate;
        }
        if (configFile.disableProtected) {
            application.Configuration.mainData.disableProtected = configFile.disableProtected;
        }
        if (program.disableProtected) {
            application.Configuration.mainData.disableProtected = program.disableProtected;
        }
        if (configFile.disableInternal) {
            application.Configuration.mainData.disableInternal = configFile.disableInternal;
        }
        if (program.disableInternal) {
            application.Configuration.mainData.disableInternal = program.disableInternal;
        }
        if (configFile.disableLifeCycleHooks) {
            application.Configuration.mainData.disableLifeCycleHooks = configFile.disableLifeCycleHooks;
        }
        if (program.disableLifeCycleHooks) {
            application.Configuration.mainData.disableLifeCycleHooks = program.disableLifeCycleHooks;
        }
        if (configFile.disableRoutesGraph) {
            application.Configuration.mainData.disableRoutesGraph = configFile.disableRoutesGraph;
        }
        if (program.disableRoutesGraph) {
            application.Configuration.mainData.disableRoutesGraph = program.disableRoutesGraph;
        }
        if (configFile.disableSearch) {
            application.Configuration.mainData.disableSearch = configFile.disableSearch;
        }
        if (program.disableSearch) {
            application.Configuration.mainData.disableSearch = program.disableSearch;
        }
        if (configFile.disableDependencies) {
            application.Configuration.mainData.disableDependencies = configFile.disableDependencies;
        }
        if (program.disableDependencies) {
            application.Configuration.mainData.disableDependencies = program.disableDependencies;
        }
        if (configFile.minimal) {
            application.Configuration.mainData.disableSearch = true;
            application.Configuration.mainData.disableRoutesGraph = true;
            application.Configuration.mainData.disableGraph = true;
            application.Configuration.mainData.disableCoverage = true;
        }
        if (program.minimal) {
            application.Configuration.mainData.disableSearch = true;
            application.Configuration.mainData.disableRoutesGraph = true;
            application.Configuration.mainData.disableGraph = true;
            application.Configuration.mainData.disableCoverage = true;
        }
        if (configFile.customFavicon) {
            application.Configuration.mainData.customFavicon = configFile.customFavicon;
        }
        if (program.customFavicon) {
            application.Configuration.mainData.customFavicon = program.customFavicon;
        }
        if (configFile.customLogo) {
            application.Configuration.mainData.customLogo = configFile.customLogo;
        }
        if (program.customLogo) {
            application.Configuration.mainData.customLogo = program.customLogo;
        }
        if (configFile.gaID) {
            application.Configuration.mainData.gaID = configFile.gaID;
        }
        if (program.gaID) {
            application.Configuration.mainData.gaID = program.gaID;
        }
        if (configFile.gaSite) {
            application.Configuration.mainData.gaSite = configFile.gaSite;
        }
        if (program.gaSite && program.gaSite !== application.COMPODOC_DEFAULTS.gaSite) {
            application.Configuration.mainData.gaSite = program.gaSite;
        }
        if (!this.isWatching) {
            if (!application.logger.silent) {
                console.log("Compodoc v" + pkg.version);
            }
            else {
                console.log(fs.readFileSync(path.join(__dirname, '../src/banner')).toString());
                console.log(pkg.version);
                console.log('');
                console.log("TypeScript version used by Compodoc : " + Ast.ts.version);
                console.log('');
                if (application.FileEngine.existsSync(cwd + path.sep + 'package.json')) {
                    var packageData = application.FileEngine.getSync(cwd + path.sep + 'package.json');
                    if (packageData) {
                        var parsedData = JSON.parse(packageData);
                        var projectDevDependencies = parsedData.devDependencies;
                        if (projectDevDependencies && projectDevDependencies.typescript) {
                            var tsProjectVersion = application.AngularVersionUtil.cleanVersion(projectDevDependencies.typescript);
                            console.log("TypeScript version of current project : " + tsProjectVersion);
                            console.log('');
                        }
                    }
                }
                console.log("Node.js version : " + process.version);
                console.log('');
                console.log("Operating system : " + osName(os.platform(), os.release()));
                console.log('');
            }
        }
        if (configExplorerResult) {
            if (typeof configExplorerResult.config !== 'undefined') {
                application.logger.info("Using configuration file : " + configExplorerResult.filepath);
            }
        }
        if (!configExplorerResult) {
            application.logger.warn("No configuration file found, switching to CLI flags.");
        }
        if (program.language && !application.I18nEngine.supportLanguage(program.language)) {
            application.logger.warn("The language " + program.language + " is not available, falling back to " + application.I18nEngine.fallbackLanguage);
        }
        if (program.tsconfig && typeof program.tsconfig === 'boolean') {
            application.logger.error("Please provide a tsconfig file.");
            process.exit(1);
        }
        if (configFile.tsconfig) {
            application.Configuration.mainData.tsconfig = configFile.tsconfig;
        }
        if (program.tsconfig) {
            application.Configuration.mainData.tsconfig = program.tsconfig;
        }
        if (program.maxSearchResults) {
            application.Configuration.mainData.maxSearchResults = program.maxSearchResults;
        }
        if (configFile.files) {
            scannedFiles = configFile.files;
        }
        if (configFile.exclude) {
            excludeFiles = configFile.exclude;
        }
        if (configFile.include) {
            includeFiles = configFile.include;
        }
        /**
         * Check --files argument call
         */
        var argv = require('minimist')(process.argv.slice(2));
        if (argv && argv.files) {
            application.Configuration.mainData.hasFilesToCoverage = true;
            if (typeof argv.files === 'string') {
                _super.prototype.setFiles.call(this, [argv.files]);
            }
            else {
                _super.prototype.setFiles.call(this, argv.files);
            }
        }
        if (program.serve && !application.Configuration.mainData.tsconfig && program.output) {
            // if -s & -d, serve it
            if (!application.FileEngine.existsSync(application.Configuration.mainData.output)) {
                application.logger.error(application.Configuration.mainData.output + " folder doesn't exist");
                process.exit(1);
            }
            else {
                application.logger.info("Serving documentation from " + application.Configuration.mainData.output + " at http://" + application.Configuration.mainData.hostname + ":" + program.port);
                _super.prototype.runWebServer.call(this, application.Configuration.mainData.output);
            }
        }
        else if (program.serve && !application.Configuration.mainData.tsconfig && !program.output) {
            // if only -s find ./documentation, if ok serve, else error provide -d
            if (!application.FileEngine.existsSync(application.Configuration.mainData.output)) {
                application.logger.error('Provide output generated folder with -d flag');
                process.exit(1);
            }
            else {
                application.logger.info("Serving documentation from " + application.Configuration.mainData.output + " at http://" + application.Configuration.mainData.hostname + ":" + program.port);
                _super.prototype.runWebServer.call(this, application.Configuration.mainData.output);
            }
        }
        else if (application.Configuration.mainData.hasFilesToCoverage) {
            if (program.coverageMinimumPerFile) {
                application.logger.info('Run documentation coverage test for files');
                _super.prototype.testCoverage.call(this);
            }
            else {
                application.logger.error('Missing coverage configuration');
            }
        }
        else {
            if (program.hideGenerator) {
                application.Configuration.mainData.hideGenerator = true;
            }
            if (application.Configuration.mainData.tsconfig && program.args.length === 0) {
                /**
                 * tsconfig file provided only
                 */
                var testTsConfigPath = application.Configuration.mainData.tsconfig.indexOf(process.cwd());
                if (testTsConfigPath !== -1) {
                    application.Configuration.mainData.tsconfig = application.Configuration.mainData.tsconfig.replace(process.cwd() + path.sep, '');
                }
                if (!application.FileEngine.existsSync(application.Configuration.mainData.tsconfig)) {
                    application.logger.error("\"" + application.Configuration.mainData.tsconfig + "\" file was not found in the current directory");
                    process.exit(1);
                }
                else {
                    var _file = path.join(path.join(process.cwd(), path.dirname(application.Configuration.mainData.tsconfig)), path.basename(application.Configuration.mainData.tsconfig));
                    // use the current directory of tsconfig.json as a working directory
                    cwd = _file
                        .split(path.sep)
                        .slice(0, -1)
                        .join(path.sep);
                    application.logger.info('Using tsconfig file ', _file);
                    var tsConfigFile = application.readConfig(_file);
                    if (tsConfigFile.files) {
                        scannedFiles = tsConfigFile.files;
                    }
                    // even if files are supplied with "files" attributes, enhance the array with includes
                    excludeFiles = tsConfigFile.exclude || [];
                    includeFiles = tsConfigFile.include || [];
                    if (scannedFiles.length > 0) {
                        includeFiles = includeFiles.concat(scannedFiles);
                    }
                    var excludeParser_1 = new ParserUtil(), includeParser_1 = new ParserUtil();
                    excludeParser_1.init(excludeFiles, cwd);
                    includeParser_1.init(includeFiles, cwd);
                    var startCwd = cwd;
                    var excludeParserTestFilesWithCwdDepth = excludeParser_1.testFilesWithCwdDepth();
                    if (!excludeParserTestFilesWithCwdDepth.status) {
                        startCwd = excludeParser_1.updateCwd(cwd, excludeParserTestFilesWithCwdDepth.level);
                    }
                    var includeParserTestFilesWithCwdDepth = includeParser_1.testFilesWithCwdDepth();
                    if (!includeParser_1.testFilesWithCwdDepth().status) {
                        startCwd = includeParser_1.updateCwd(cwd, includeParserTestFilesWithCwdDepth.level);
                    }
                    var finder = require('findit2')(startCwd || '.');
                    finder.on('directory', function (dir, stat, stop) {
                        var base = path.basename(dir);
                        if (base === '.git' || base === 'node_modules') {
                            stop();
                        }
                    });
                    finder.on('file', function (file, stat) {
                        if (/(spec|\.d)\.ts/.test(file)) {
                            application.logger.warn('Ignoring', file);
                        }
                        else if (excludeParser_1.testFile(file) && path.extname(file) === '.ts') {
                            application.logger.warn('Excluding', file);
                        }
                        else if (includeFiles.length > 0) {
                            /**
                             * If include provided in tsconfig, use only this source,
                             * and not files found with global findit scan in working directory
                             */
                            if (path.extname(file) === '.ts' && includeParser_1.testFile(file)) {
                                application.logger.debug('Including', file);
                                scannedFiles.push(file);
                            }
                            else {
                                if (path.extname(file) === '.ts') {
                                    application.logger.warn('Excludinge', file);
                                }
                            }
                        }
                        else {
                            application.logger.debug('Including', file);
                            scannedFiles.push(file);
                        }
                    });
                    finder.on('end', function () {
                        _super.prototype.setFiles.call(_this, scannedFiles);
                        if (program.coverageTest || program.coverageTestPerFile) {
                            application.logger.info('Run documentation coverage test');
                            _super.prototype.testCoverage.call(_this);
                        }
                        else {
                            _super.prototype.generate.call(_this);
                        }
                    });
                }
            }
            else if (application.Configuration.mainData.tsconfig && program.args.length > 0) {
                /**
                 * tsconfig file provided with source folder in arg
                 */
                var testTsConfigPath = application.Configuration.mainData.tsconfig.indexOf(process.cwd());
                if (testTsConfigPath !== -1) {
                    application.Configuration.mainData.tsconfig = application.Configuration.mainData.tsconfig.replace(process.cwd() + path.sep, '');
                }
                var sourceFolder = program.args[0];
                if (!application.FileEngine.existsSync(sourceFolder)) {
                    application.logger.error("Provided source folder " + sourceFolder + " was not found in the current directory");
                    process.exit(1);
                }
                else {
                    application.logger.info('Using provided source folder');
                    if (!application.FileEngine.existsSync(application.Configuration.mainData.tsconfig)) {
                        application.logger.error("\"" + application.Configuration.mainData.tsconfig + "\" file was not found in the current directory");
                        process.exit(1);
                    }
                    else {
                        var _file = path.join(path.join(process.cwd(), path.dirname(application.Configuration.mainData.tsconfig)), path.basename(application.Configuration.mainData.tsconfig));
                        // use the current directory of tsconfig.json as a working directory
                        cwd = _file
                            .split(path.sep)
                            .slice(0, -1)
                            .join(path.sep);
                        application.logger.info('Using tsconfig file ', _file);
                        var tsConfigFile = application.readConfig(_file);
                        if (tsConfigFile.files) {
                            scannedFiles = tsConfigFile.files;
                        }
                        // even if files are supplied with "files" attributes, enhance the array with includes
                        excludeFiles = tsConfigFile.exclude || [];
                        includeFiles = tsConfigFile.include || [];
                        if (scannedFiles.length > 0) {
                            includeFiles = includeFiles.concat(scannedFiles);
                        }
                        var excludeParser_2 = new ParserUtil(), includeParser_2 = new ParserUtil();
                        excludeParser_2.init(excludeFiles, cwd);
                        includeParser_2.init(includeFiles, cwd);
                        var startCwd = sourceFolder;
                        var excludeParserTestFilesWithCwdDepth = excludeParser_2.testFilesWithCwdDepth();
                        if (!excludeParserTestFilesWithCwdDepth.status) {
                            startCwd = excludeParser_2.updateCwd(cwd, excludeParserTestFilesWithCwdDepth.level);
                        }
                        var includeParserTestFilesWithCwdDepth = includeParser_2.testFilesWithCwdDepth();
                        if (!includeParser_2.testFilesWithCwdDepth().status) {
                            startCwd = includeParser_2.updateCwd(cwd, includeParserTestFilesWithCwdDepth.level);
                        }
                        var finder = require('findit2')(path.resolve(startCwd));
                        finder.on('directory', function (dir, stat, stop) {
                            var base = path.basename(dir);
                            if (base === '.git' || base === 'node_modules') {
                                stop();
                            }
                        });
                        finder.on('file', function (file, stat) {
                            if (/(spec|\.d)\.ts/.test(file)) {
                                application.logger.warn('Ignoring', file);
                            }
                            else if (excludeParser_2.testFile(file)) {
                                application.logger.warn('Excluding', file);
                            }
                            else if (includeFiles.length > 0) {
                                /**
                                 * If include provided in tsconfig, use only this source,
                                 * and not files found with global findit scan in working directory
                                 */
                                if (path.extname(file) === '.ts' && includeParser_2.testFile(file)) {
                                    application.logger.debug('Including', file);
                                    scannedFiles.push(file);
                                }
                                else {
                                    if (path.extname(file) === '.ts') {
                                        application.logger.warn('Excluding', file);
                                    }
                                }
                            }
                            else {
                                application.logger.debug('Including', file);
                                scannedFiles.push(file);
                            }
                        });
                        finder.on('end', function () {
                            _super.prototype.setFiles.call(_this, scannedFiles);
                            if (program.coverageTest || program.coverageTestPerFile) {
                                application.logger.info('Run documentation coverage test');
                                _super.prototype.testCoverage.call(_this);
                            }
                            else {
                                _super.prototype.generate.call(_this);
                            }
                        });
                    }
                }
            }
            else {
                application.logger.error('tsconfig.json file was not found, please use -p flag');
                outputHelp();
            }
        }
    };
    return CliApplication;
}(application.Application));

exports.CliApplication = CliApplication;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgtY2xpLmpzIiwic291cmNlcyI6WyIuLi9zcmMvdXRpbHMvcGFyc2VyLnV0aWwuY2xhc3MudHMiLCIuLi9zcmMvaW5kZXgtY2xpLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5cbmNvbnN0IGdsb2IgPSByZXF1aXJlKCdnbG9iJyk7XG5cbmV4cG9ydCBjbGFzcyBQYXJzZXJVdGlsIHtcbiAgICBwcml2YXRlIF9maWxlcztcbiAgICBwcml2YXRlIF9jd2Q7XG4gICAgcHJpdmF0ZSBfZ2xvYkZpbGVzID0gW107XG5cbiAgICBwdWJsaWMgaW5pdChleGNsdWRlOiBzdHJpbmdbXSwgY3dkOiBzdHJpbmcpIHtcbiAgICAgICAgdGhpcy5fZmlsZXMgPSBleGNsdWRlO1xuICAgICAgICB0aGlzLl9jd2QgPSBjd2Q7XG4gICAgICAgIGxldCBpID0gMDtcbiAgICAgICAgbGV0IGxlbiA9IGV4Y2x1ZGUubGVuZ3RoO1xuXG4gICAgICAgIGZvciAoaTsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLl9nbG9iRmlsZXMgPSBbLi4udGhpcy5fZ2xvYkZpbGVzLCAuLi5nbG9iLnN5bmMoZXhjbHVkZVtpXSwgeyBjd2Q6IHRoaXMuX2N3ZCB9KV07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMgdGVzdEZpbGVzV2l0aEN3ZERlcHRoKCkge1xuICAgICAgICBsZXQgaSA9IDA7XG4gICAgICAgIGxldCBsZW4gPSB0aGlzLl9maWxlcy5sZW5ndGg7XG4gICAgICAgIGxldCByZXN1bHQgPSB7XG4gICAgICAgICAgICBzdGF0dXM6IHRydWUsXG4gICAgICAgICAgICBsZXZlbDogMFxuICAgICAgICB9O1xuICAgICAgICBmb3IgKGk7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgbGV0IGVsZW1lbnRQYXRoID0gcGF0aC5yZXNvbHZlKHRoaXMuX2N3ZCArIHBhdGguc2VwLCB0aGlzLl9maWxlc1tpXSk7XG4gICAgICAgICAgICBpZiAoZWxlbWVudFBhdGguaW5kZXhPZih0aGlzLl9jd2QpID09PSAtMSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5zdGF0dXMgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBsZXQgbGV2ZWwgPSB0aGlzLl9maWxlc1tpXS5tYXRjaCgvXFwuLlxcLy9nKS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgaWYgKGxldmVsID4gcmVzdWx0LmxldmVsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5sZXZlbCA9IGxldmVsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIHB1YmxpYyB1cGRhdGVDd2QoY3dkLCBsZXZlbCkge1xuICAgICAgICBsZXQgX2N3ZCA9IGN3ZCxcbiAgICAgICAgICAgIF9yZXdpbmQgPSAnJztcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZXZlbDsgaSsrKSB7XG4gICAgICAgICAgICBfcmV3aW5kICs9ICcuLi8nO1xuICAgICAgICB9XG4gICAgICAgIF9jd2QgPSBwYXRoLnJlc29sdmUoX2N3ZCwgX3Jld2luZCk7XG4gICAgICAgIHJldHVybiBfY3dkO1xuICAgIH1cblxuICAgIHB1YmxpYyB0ZXN0RmlsZShmaWxlOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgbGV0IGkgPSAwO1xuICAgICAgICBsZXQgbGVuID0gdGhpcy5fZmlsZXMubGVuZ3RoO1xuICAgICAgICBsZXQgZmlsZUJhc2VuYW1lID0gcGF0aC5iYXNlbmFtZShmaWxlKTtcbiAgICAgICAgbGV0IGZpbGVOYW1lSW5Dd2QgPSBmaWxlLnJlcGxhY2UodGhpcy5fY3dkICsgcGF0aC5zZXAsICcnKTtcbiAgICAgICAgbGV0IHJlc3VsdCA9IGZhbHNlO1xuXG4gICAgICAgIGlmIChwYXRoLnNlcCA9PT0gJ1xcXFwnKSB7XG4gICAgICAgICAgICBmaWxlTmFtZUluQ3dkID0gZmlsZU5hbWVJbkN3ZC5yZXBsYWNlKG5ldyBSZWdFeHAoJ1xcXFwnICsgcGF0aC5zZXAsICdnJyksICcvJyk7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGk7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgaWYgKGdsb2IuaGFzTWFnaWModGhpcy5fZmlsZXNbaV0pICYmIHRoaXMuX2dsb2JGaWxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgbGV0IHJlc3VsdEdsb2JTZWFyY2ggPSB0aGlzLl9nbG9iRmlsZXMuZmluZEluZGV4KGVsZW1lbnQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBsZXQgZWxlbWVudFBhdGggPSBwYXRoLnJlc29sdmUodGhpcy5fY3dkICsgcGF0aC5zZXAsIGVsZW1lbnQpO1xuICAgICAgICAgICAgICAgICAgICBsZXQgZWxlbWVudFBhdGhJbkN3ZCA9IGVsZW1lbnRQYXRoLnJlcGxhY2UodGhpcy5fY3dkICsgcGF0aC5zZXAsICcnKTtcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudFBhdGhJbkN3ZCA9IGVsZW1lbnRQYXRoSW5Dd2QucmVwbGFjZShcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBSZWdFeHAoJ1xcXFwnICsgcGF0aC5zZXAsICdnJyksXG4gICAgICAgICAgICAgICAgICAgICAgICAnLydcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnRQYXRoSW5Dd2QgPT09IGZpbGVOYW1lSW5Dd2Q7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gcmVzdWx0R2xvYlNlYXJjaCAhPT0gLTE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZpbGVOYW1lSW5Dd2QgPT09IHRoaXMuX2ZpbGVzW2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxufVxuIiwiaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcblxuaW1wb3J0IHsgdHMgfSBmcm9tICd0cy1zaW1wbGUtYXN0JztcblxuaW1wb3J0IHsgQXBwbGljYXRpb24gfSBmcm9tICcuL2FwcC9hcHBsaWNhdGlvbic7XG5pbXBvcnQgQ29uZmlndXJhdGlvbiBmcm9tICcuL2FwcC9jb25maWd1cmF0aW9uJztcbmltcG9ydCBGaWxlRW5naW5lIGZyb20gJy4vYXBwL2VuZ2luZXMvZmlsZS5lbmdpbmUnO1xuaW1wb3J0IEkxOG5FbmdpbmUgZnJvbSAnLi9hcHAvZW5naW5lcy9pMThuLmVuZ2luZSc7XG5cbmltcG9ydCB7IENvbmZpZ3VyYXRpb25GaWxlSW50ZXJmYWNlIH0gZnJvbSAnLi9hcHAvaW50ZXJmYWNlcy9jb25maWd1cmF0aW9uLWZpbGUuaW50ZXJmYWNlJztcbmltcG9ydCBBbmd1bGFyVmVyc2lvblV0aWwgZnJvbSAnLi91dGlscy9hbmd1bGFyLXZlcnNpb24udXRpbCc7XG5pbXBvcnQgeyBDT01QT0RPQ19ERUZBVUxUUyB9IGZyb20gJy4vdXRpbHMvZGVmYXVsdHMnO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnLi91dGlscy9sb2dnZXInO1xuaW1wb3J0IHsgUGFyc2VyVXRpbCB9IGZyb20gJy4vdXRpbHMvcGFyc2VyLnV0aWwuY2xhc3MnO1xuaW1wb3J0IHsgaGFuZGxlUGF0aCwgcmVhZENvbmZpZyB9IGZyb20gJy4vdXRpbHMvdXRpbHMnO1xuXG5pbXBvcnQgeyBjb3NtaWNvbmZpZ1N5bmMgfSBmcm9tICdjb3NtaWNvbmZpZyc7XG5cbmNvbnN0IG9zID0gcmVxdWlyZSgnb3MnKTtcbmNvbnN0IG9zTmFtZSA9IHJlcXVpcmUoJ29zLW5hbWUnKTtcbmNvbnN0IHBrZyA9IHJlcXVpcmUoJy4uL3BhY2thZ2UuanNvbicpO1xuY29uc3QgcHJvZ3JhbSA9IHJlcXVpcmUoJ2NvbW1hbmRlcicpO1xuXG5jb25zdCBjb3NtaWNvbmZpZ01vZHVsZU5hbWUgPSAnY29tcG9kb2MnO1xuXG5sZXQgc2Nhbm5lZEZpbGVzID0gW107XG5sZXQgZXhjbHVkZUZpbGVzO1xubGV0IGluY2x1ZGVGaWxlcztcbmxldCBjd2QgPSBwcm9jZXNzLmN3ZCgpO1xuXG5wcm9jZXNzLnNldE1heExpc3RlbmVycygwKTtcblxuZXhwb3J0IGNsYXNzIENsaUFwcGxpY2F0aW9uIGV4dGVuZHMgQXBwbGljYXRpb24ge1xuICAgIC8qKlxuICAgICAqIFJ1biBjb21wb2RvYyBmcm9tIHRoZSBjb21tYW5kIGxpbmUuXG4gICAgICovXG4gICAgcHJvdGVjdGVkIHN0YXJ0KCk6IGFueSB7XG4gICAgICAgIGZ1bmN0aW9uIGxpc3QodmFsKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsLnNwbGl0KCcsJyk7XG4gICAgICAgIH1cblxuICAgICAgICBwcm9ncmFtXG4gICAgICAgICAgICAudmVyc2lvbihwa2cudmVyc2lvbilcbiAgICAgICAgICAgIC51c2FnZSgnPHNyYz4gW29wdGlvbnNdJylcbiAgICAgICAgICAgIC5vcHRpb24oXG4gICAgICAgICAgICAgICAgJy1jLCAtLWNvbmZpZyBbY29uZmlnXScsXG4gICAgICAgICAgICAgICAgJ0EgY29uZmlndXJhdGlvbiBmaWxlIDogLmNvbXBvZG9jcmMsIC5jb21wb2RvY3JjLmpzb24sIC5jb21wb2RvY3JjLnlhbWwgb3IgY29tcG9kb2MgcHJvcGVydHkgaW4gcGFja2FnZS5qc29uJ1xuICAgICAgICAgICAgKVxuICAgICAgICAgICAgLm9wdGlvbignLXAsIC0tdHNjb25maWcgW2NvbmZpZ10nLCAnQSB0c2NvbmZpZy5qc29uIGZpbGUnKVxuICAgICAgICAgICAgLm9wdGlvbihcbiAgICAgICAgICAgICAgICAnLWQsIC0tb3V0cHV0IFtmb2xkZXJdJyxcbiAgICAgICAgICAgICAgICAnV2hlcmUgdG8gc3RvcmUgdGhlIGdlbmVyYXRlZCBkb2N1bWVudGF0aW9uJyxcbiAgICAgICAgICAgICAgICBDT01QT0RPQ19ERUZBVUxUUy5mb2xkZXJcbiAgICAgICAgICAgIClcbiAgICAgICAgICAgIC5vcHRpb24oJy15LCAtLWV4dFRoZW1lIFtmaWxlXScsICdFeHRlcm5hbCBzdHlsaW5nIHRoZW1lIGZpbGUnKVxuICAgICAgICAgICAgLm9wdGlvbignLW4sIC0tbmFtZSBbbmFtZV0nLCAnVGl0bGUgZG9jdW1lbnRhdGlvbicsIENPTVBPRE9DX0RFRkFVTFRTLnRpdGxlKVxuICAgICAgICAgICAgLm9wdGlvbihcbiAgICAgICAgICAgICAgICAnLWEsIC0tYXNzZXRzRm9sZGVyIFtmb2xkZXJdJyxcbiAgICAgICAgICAgICAgICAnRXh0ZXJuYWwgYXNzZXRzIGZvbGRlciB0byBjb3B5IGluIGdlbmVyYXRlZCBkb2N1bWVudGF0aW9uIGZvbGRlcidcbiAgICAgICAgICAgIClcbiAgICAgICAgICAgIC5vcHRpb24oJy1vLCAtLW9wZW4gW3ZhbHVlXScsICdPcGVuIHRoZSBnZW5lcmF0ZWQgZG9jdW1lbnRhdGlvbicpXG4gICAgICAgICAgICAub3B0aW9uKFxuICAgICAgICAgICAgICAgICctdCwgLS1zaWxlbnQnLFxuICAgICAgICAgICAgICAgIFwiSW4gc2lsZW50IG1vZGUsIGxvZyBtZXNzYWdlcyBhcmVuJ3QgbG9nZ2VkIGluIHRoZSBjb25zb2xlXCIsXG4gICAgICAgICAgICAgICAgZmFsc2VcbiAgICAgICAgICAgIClcbiAgICAgICAgICAgIC5vcHRpb24oXG4gICAgICAgICAgICAgICAgJy1zLCAtLXNlcnZlJyxcbiAgICAgICAgICAgICAgICAnU2VydmUgZ2VuZXJhdGVkIGRvY3VtZW50YXRpb24gKGRlZmF1bHQgaHR0cDovL2xvY2FsaG9zdDo4MDgwLyknLFxuICAgICAgICAgICAgICAgIGZhbHNlXG4gICAgICAgICAgICApXG4gICAgICAgICAgICAub3B0aW9uKCctLWhvc3QgW2hvc3RdJywgJ0NoYW5nZSBkZWZhdWx0IGhvc3QgYWRkcmVzcycpXG4gICAgICAgICAgICAub3B0aW9uKCctciwgLS1wb3J0IFtwb3J0XScsICdDaGFuZ2UgZGVmYXVsdCBzZXJ2aW5nIHBvcnQnLCBDT01QT0RPQ19ERUZBVUxUUy5wb3J0KVxuICAgICAgICAgICAgLm9wdGlvbihcbiAgICAgICAgICAgICAgICAnLXcsIC0td2F0Y2gnLFxuICAgICAgICAgICAgICAgICdXYXRjaCBzb3VyY2UgZmlsZXMgYWZ0ZXIgc2VydmUgYW5kIGZvcmNlIGRvY3VtZW50YXRpb24gcmVidWlsZCcsXG4gICAgICAgICAgICAgICAgZmFsc2VcbiAgICAgICAgICAgIClcbiAgICAgICAgICAgIC5vcHRpb24oXG4gICAgICAgICAgICAgICAgJy1lLCAtLWV4cG9ydEZvcm1hdCBbZm9ybWF0XScsXG4gICAgICAgICAgICAgICAgJ0V4cG9ydCBpbiBzcGVjaWZpZWQgZm9ybWF0IChqc29uLCBodG1sKScsXG4gICAgICAgICAgICAgICAgQ09NUE9ET0NfREVGQVVMVFMuZXhwb3J0Rm9ybWF0XG4gICAgICAgICAgICApXG4gICAgICAgICAgICAub3B0aW9uKCctLWZpbGVzIFtmaWxlc10nLCAnRmlsZXMgcHJvdmlkZWQgYnkgZXh0ZXJuYWwgdG9vbCwgdXNlZCBmb3IgY292ZXJhZ2UgdGVzdCcpXG4gICAgICAgICAgICAub3B0aW9uKFxuICAgICAgICAgICAgICAgICctLWxhbmd1YWdlIFtsYW5ndWFnZV0nLFxuICAgICAgICAgICAgICAgICdMYW5ndWFnZSB1c2VkIGZvciB0aGUgZ2VuZXJhdGVkIGRvY3VtZW50YXRpb24gKGRlLURFLCBlbi1VUywgZXMtRVMsIGZyLUZSLCBodS1IVSwgaXQtSVQsIGphLUpQLCBubC1OTCwgcHQtQlIsIHNrLVNLLCB6aC1DTiknLFxuICAgICAgICAgICAgICAgIENPTVBPRE9DX0RFRkFVTFRTLmxhbmd1YWdlXG4gICAgICAgICAgICApXG4gICAgICAgICAgICAub3B0aW9uKFxuICAgICAgICAgICAgICAgICctLXRoZW1lIFt0aGVtZV0nLFxuICAgICAgICAgICAgICAgIFwiQ2hvb3NlIG9uZSBvZiBhdmFpbGFibGUgdGhlbWVzLCBkZWZhdWx0IGlzICdnaXRib29rJyAobGFyYXZlbCwgb3JpZ2luYWwsIG1hdGVyaWFsLCBwb3N0bWFyaywgcmVhZHRoZWRvY3MsIHN0cmlwZSwgdmFncmFudClcIlxuICAgICAgICAgICAgKVxuICAgICAgICAgICAgLm9wdGlvbihcbiAgICAgICAgICAgICAgICAnLS1oaWRlR2VuZXJhdG9yJyxcbiAgICAgICAgICAgICAgICAnRG8gbm90IHByaW50IHRoZSBDb21wb2RvYyBsaW5rIGF0IHRoZSBib3R0b20gb2YgdGhlIHBhZ2UnLFxuICAgICAgICAgICAgICAgIGZhbHNlXG4gICAgICAgICAgICApXG4gICAgICAgICAgICAub3B0aW9uKFxuICAgICAgICAgICAgICAgICctLXRvZ2dsZU1lbnVJdGVtcyA8aXRlbXM+JyxcbiAgICAgICAgICAgICAgICBcIkNsb3NlIGJ5IGRlZmF1bHQgaXRlbXMgaW4gdGhlIG1lbnUgdmFsdWVzIDogWydhbGwnXSBvciBvbmUgb2YgdGhlc2UgWydtb2R1bGVzJywnY29tcG9uZW50cycsJ2RpcmVjdGl2ZXMnLCdjb250cm9sbGVycycsJ2NsYXNzZXMnLCdpbmplY3RhYmxlcycsJ2d1YXJkcycsJ2ludGVyZmFjZXMnLCdpbnRlcmNlcHRvcnMnLCdwaXBlcycsJ21pc2NlbGxhbmVvdXMnLCdhZGRpdGlvbmFsUGFnZXMnXVwiLFxuICAgICAgICAgICAgICAgIGxpc3QsXG4gICAgICAgICAgICAgICAgQ09NUE9ET0NfREVGQVVMVFMudG9nZ2xlTWVudUl0ZW1zXG4gICAgICAgICAgICApXG4gICAgICAgICAgICAub3B0aW9uKFxuICAgICAgICAgICAgICAgICctLW5hdlRhYkNvbmZpZyA8dGFiIGNvbmZpZ3M+JyxcbiAgICAgICAgICAgICAgICBgTGlzdCBuYXZpZ2F0aW9uIHRhYiBvYmplY3RzIGluIHRoZSBkZXNpcmVkIG9yZGVyIHdpdGggdHdvIHN0cmluZyBwcm9wZXJ0aWVzIChcImlkXCIgYW5kIFwibGFiZWxcIikuIFxcXG5Eb3VibGUtcXVvdGVzIG11c3QgYmUgZXNjYXBlZCB3aXRoICdcXFxcJy4gXFxcbkF2YWlsYWJsZSB0YWIgSURzIGFyZSBcImluZm9cIiwgXCJyZWFkbWVcIiwgXCJzb3VyY2VcIiwgXCJ0ZW1wbGF0ZURhdGFcIiwgXCJzdHlsZURhdGFcIiwgXCJ0cmVlXCIsIGFuZCBcImV4YW1wbGVcIi4gXFxcbk5vdGU6IENlcnRhaW4gdGFicyB3aWxsIG9ubHkgYmUgc2hvd24gaWYgYXBwbGljYWJsZSB0byBhIGdpdmVuIGRlcGVuZGVuY3lgLFxuICAgICAgICAgICAgICAgIGxpc3QsXG4gICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoQ09NUE9ET0NfREVGQVVMVFMubmF2VGFiQ29uZmlnKVxuICAgICAgICAgICAgKVxuICAgICAgICAgICAgLm9wdGlvbihcbiAgICAgICAgICAgICAgICAnLS10ZW1wbGF0ZXMgW2ZvbGRlcl0nLFxuICAgICAgICAgICAgICAgICdQYXRoIHRvIGRpcmVjdG9yeSBvZiBIYW5kbGViYXJzIHRlbXBsYXRlcyB0byBvdmVycmlkZSBidWlsdC1pbiB0ZW1wbGF0ZXMnXG4gICAgICAgICAgICApXG4gICAgICAgICAgICAub3B0aW9uKCctLWluY2x1ZGVzIFtwYXRoXScsICdQYXRoIG9mIGV4dGVybmFsIG1hcmtkb3duIGZpbGVzIHRvIGluY2x1ZGUnKVxuICAgICAgICAgICAgLm9wdGlvbihcbiAgICAgICAgICAgICAgICAnLS1pbmNsdWRlc05hbWUgW25hbWVdJyxcbiAgICAgICAgICAgICAgICAnTmFtZSBvZiBpdGVtIG1lbnUgb2YgZXh0ZXJuYWxzIG1hcmtkb3duIGZpbGVzJyxcbiAgICAgICAgICAgICAgICBDT01QT0RPQ19ERUZBVUxUUy5hZGRpdGlvbmFsRW50cnlOYW1lXG4gICAgICAgICAgICApXG4gICAgICAgICAgICAub3B0aW9uKFxuICAgICAgICAgICAgICAgICctLWNvdmVyYWdlVGVzdCBbdGhyZXNob2xkXScsXG4gICAgICAgICAgICAgICAgJ1Rlc3QgY29tbWFuZCBvZiBkb2N1bWVudGF0aW9uIGNvdmVyYWdlIHdpdGggYSB0aHJlc2hvbGQgKGRlZmF1bHQgNzApJ1xuICAgICAgICAgICAgKVxuICAgICAgICAgICAgLm9wdGlvbihcbiAgICAgICAgICAgICAgICAnLS1jb3ZlcmFnZU1pbmltdW1QZXJGaWxlIFttaW5pbXVtXScsXG4gICAgICAgICAgICAgICAgJ1Rlc3QgY29tbWFuZCBvZiBkb2N1bWVudGF0aW9uIGNvdmVyYWdlIHBlciBmaWxlIHdpdGggYSBtaW5pbXVtIChkZWZhdWx0IDApJ1xuICAgICAgICAgICAgKVxuICAgICAgICAgICAgLm9wdGlvbihcbiAgICAgICAgICAgICAgICAnLS1jb3ZlcmFnZVRlc3RUaHJlc2hvbGRGYWlsIFt0cnVlfGZhbHNlXScsXG4gICAgICAgICAgICAgICAgJ1Rlc3QgY29tbWFuZCBvZiBkb2N1bWVudGF0aW9uIGNvdmVyYWdlIChnbG9iYWwgb3IgcGVyIGZpbGUpIHdpbGwgZmFpbCB3aXRoIGVycm9yIG9yIGp1c3Qgd2FybiB1c2VyICh0cnVlOiBlcnJvciwgZmFsc2U6IHdhcm4pJyxcbiAgICAgICAgICAgICAgICBDT01QT0RPQ19ERUZBVUxUUy5jb3ZlcmFnZVRlc3RUaHJlc2hvbGRGYWlsXG4gICAgICAgICAgICApXG4gICAgICAgICAgICAub3B0aW9uKCctLWNvdmVyYWdlVGVzdFNob3dPbmx5RmFpbGVkJywgJ0Rpc3BsYXkgb25seSBmYWlsZWQgZmlsZXMgZm9yIGEgY292ZXJhZ2UgdGVzdCcpXG4gICAgICAgICAgICAub3B0aW9uKFxuICAgICAgICAgICAgICAgICctLXVuaXRUZXN0Q292ZXJhZ2UgW2pzb24tc3VtbWFyeV0nLFxuICAgICAgICAgICAgICAgICdUbyBpbmNsdWRlIHVuaXQgdGVzdCBjb3ZlcmFnZSwgc3BlY2lmeSBpc3RhbmJ1bCBKU09OIGNvdmVyYWdlIHN1bW1hcnkgZmlsZSdcbiAgICAgICAgICAgIClcbiAgICAgICAgICAgIC5vcHRpb24oXG4gICAgICAgICAgICAgICAgJy0tZGlzYWJsZVNvdXJjZUNvZGUnLFxuICAgICAgICAgICAgICAgICdEbyBub3QgYWRkIHNvdXJjZSBjb2RlIHRhYiBhbmQgbGlua3MgdG8gc291cmNlIGNvZGUnLFxuICAgICAgICAgICAgICAgIGZhbHNlXG4gICAgICAgICAgICApXG4gICAgICAgICAgICAub3B0aW9uKCctLWRpc2FibGVEb21UcmVlJywgJ0RvIG5vdCBhZGQgZG9tIHRyZWUgdGFiJywgZmFsc2UpXG4gICAgICAgICAgICAub3B0aW9uKCctLWRpc2FibGVUZW1wbGF0ZVRhYicsICdEbyBub3QgYWRkIHRlbXBsYXRlIHRhYicsIGZhbHNlKVxuICAgICAgICAgICAgLm9wdGlvbignLS1kaXNhYmxlU3R5bGVUYWInLCAnRG8gbm90IGFkZCBzdHlsZSB0YWInLCBmYWxzZSlcbiAgICAgICAgICAgIC5vcHRpb24oJy0tZGlzYWJsZUdyYXBoJywgJ0RvIG5vdCBhZGQgdGhlIGRlcGVuZGVuY3kgZ3JhcGgnLCBmYWxzZSlcbiAgICAgICAgICAgIC5vcHRpb24oJy0tZGlzYWJsZUNvdmVyYWdlJywgJ0RvIG5vdCBhZGQgdGhlIGRvY3VtZW50YXRpb24gY292ZXJhZ2UgcmVwb3J0JywgZmFsc2UpXG4gICAgICAgICAgICAub3B0aW9uKCctLWRpc2FibGVQcml2YXRlJywgJ0RvIG5vdCBzaG93IHByaXZhdGUgaW4gZ2VuZXJhdGVkIGRvY3VtZW50YXRpb24nLCBmYWxzZSlcbiAgICAgICAgICAgIC5vcHRpb24oJy0tZGlzYWJsZVByb3RlY3RlZCcsICdEbyBub3Qgc2hvdyBwcm90ZWN0ZWQgaW4gZ2VuZXJhdGVkIGRvY3VtZW50YXRpb24nLCBmYWxzZSlcbiAgICAgICAgICAgIC5vcHRpb24oJy0tZGlzYWJsZUludGVybmFsJywgJ0RvIG5vdCBzaG93IEBpbnRlcm5hbCBpbiBnZW5lcmF0ZWQgZG9jdW1lbnRhdGlvbicsIGZhbHNlKVxuICAgICAgICAgICAgLm9wdGlvbihcbiAgICAgICAgICAgICAgICAnLS1kaXNhYmxlTGlmZUN5Y2xlSG9va3MnLFxuICAgICAgICAgICAgICAgICdEbyBub3Qgc2hvdyBBbmd1bGFyIGxpZmVjeWNsZSBob29rcyBpbiBnZW5lcmF0ZWQgZG9jdW1lbnRhdGlvbicsXG4gICAgICAgICAgICAgICAgZmFsc2VcbiAgICAgICAgICAgIClcbiAgICAgICAgICAgIC5vcHRpb24oXG4gICAgICAgICAgICAgICAgJy0tZGlzYWJsZVJvdXRlc0dyYXBoJyxcbiAgICAgICAgICAgICAgICAnRG8gbm90IGFkZCB0aGUgcm91dGVzIGdyYXBoJyxcbiAgICAgICAgICAgICAgICBDT01QT0RPQ19ERUZBVUxUUy5kaXNhYmxlUm91dGVzR3JhcGhcbiAgICAgICAgICAgIClcbiAgICAgICAgICAgIC5vcHRpb24oJy0tZGlzYWJsZVNlYXJjaCcsICdEbyBub3QgYWRkIHRoZSBzZWFyY2ggaW5wdXQnLCBmYWxzZSlcbiAgICAgICAgICAgIC5vcHRpb24oXG4gICAgICAgICAgICAgICAgJy0tZGlzYWJsZURlcGVuZGVuY2llcycsXG4gICAgICAgICAgICAgICAgJ0RvIG5vdCBhZGQgdGhlIGRlcGVuZGVuY2llcyBsaXN0JyxcbiAgICAgICAgICAgICAgICBDT01QT0RPQ19ERUZBVUxUUy5kaXNhYmxlRGVwZW5kZW5jaWVzXG4gICAgICAgICAgICApXG4gICAgICAgICAgICAub3B0aW9uKFxuICAgICAgICAgICAgICAgICctLW1pbmltYWwnLFxuICAgICAgICAgICAgICAgICdNaW5pbWFsIG1vZGUgd2l0aCBvbmx5IGRvY3VtZW50YXRpb24uIE5vIHNlYXJjaCwgbm8gZ3JhcGgsIG5vIGNvdmVyYWdlLicsXG4gICAgICAgICAgICAgICAgZmFsc2VcbiAgICAgICAgICAgIClcbiAgICAgICAgICAgIC5vcHRpb24oJy0tY3VzdG9tRmF2aWNvbiBbcGF0aF0nLCAnVXNlIGEgY3VzdG9tIGZhdmljb24nKVxuICAgICAgICAgICAgLm9wdGlvbignLS1jdXN0b21Mb2dvIFtwYXRoXScsICdVc2UgYSBjdXN0b20gbG9nbycpXG4gICAgICAgICAgICAub3B0aW9uKCctLWdhSUQgW2lkXScsICdHb29nbGUgQW5hbHl0aWNzIHRyYWNraW5nIElEJylcbiAgICAgICAgICAgIC5vcHRpb24oJy0tZ2FTaXRlIFtzaXRlXScsICdHb29nbGUgQW5hbHl0aWNzIHNpdGUgbmFtZScsIENPTVBPRE9DX0RFRkFVTFRTLmdhU2l0ZSlcbiAgICAgICAgICAgIC5vcHRpb24oXG4gICAgICAgICAgICAgICAgJy0tbWF4U2VhcmNoUmVzdWx0cyBbbWF4U2VhcmNoUmVzdWx0c10nLFxuICAgICAgICAgICAgICAgICdNYXggc2VhcmNoIHJlc3VsdHMgb24gdGhlIHJlc3VsdHMgcGFnZS4gVG8gc2hvdyBhbGwgcmVzdWx0cywgc2V0IHRvIDAnLFxuICAgICAgICAgICAgICAgIENPTVBPRE9DX0RFRkFVTFRTLm1heFNlYXJjaFJlc3VsdHNcbiAgICAgICAgICAgIClcbiAgICAgICAgICAgIC5wYXJzZShwcm9jZXNzLmFyZ3YpO1xuXG4gICAgICAgIGxldCBvdXRwdXRIZWxwID0gKCkgPT4ge1xuICAgICAgICAgICAgcHJvZ3JhbS5vdXRwdXRIZWxwKCk7XG4gICAgICAgICAgICBwcm9jZXNzLmV4aXQoMSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgY29uZmlnRXhwbG9yZXIgPSBjb3NtaWNvbmZpZ1N5bmMoY29zbWljb25maWdNb2R1bGVOYW1lKTtcblxuICAgICAgICBsZXQgY29uZmlnRXhwbG9yZXJSZXN1bHQ7XG5cbiAgICAgICAgbGV0IGNvbmZpZ0ZpbGU6IENvbmZpZ3VyYXRpb25GaWxlSW50ZXJmYWNlID0ge307XG5cbiAgICAgICAgaWYgKHByb2dyYW0uY29uZmlnKSB7XG4gICAgICAgICAgICBsZXQgY29uZmlnRmlsZVBhdGggPSBwcm9ncmFtLmNvbmZpZztcbiAgICAgICAgICAgIGxldCB0ZXN0Q29uZmlnRmlsZVBhdGggPSBjb25maWdGaWxlUGF0aC5tYXRjaChwcm9jZXNzLmN3ZCgpKTtcbiAgICAgICAgICAgIGlmICh0ZXN0Q29uZmlnRmlsZVBhdGggJiYgdGVzdENvbmZpZ0ZpbGVQYXRoLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBjb25maWdGaWxlUGF0aCA9IGNvbmZpZ0ZpbGVQYXRoLnJlcGxhY2UocHJvY2Vzcy5jd2QoKSArIHBhdGguc2VwLCAnJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25maWdFeHBsb3JlclJlc3VsdCA9IGNvbmZpZ0V4cGxvcmVyLmxvYWQocGF0aC5yZXNvbHZlKGNvbmZpZ0ZpbGVQYXRoKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25maWdFeHBsb3JlclJlc3VsdCA9IGNvbmZpZ0V4cGxvcmVyLnNlYXJjaCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbmZpZ0V4cGxvcmVyUmVzdWx0KSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNvbmZpZ0V4cGxvcmVyUmVzdWx0LmNvbmZpZyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBjb25maWdGaWxlID0gY29uZmlnRXhwbG9yZXJSZXN1bHQuY29uZmlnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbmZpZ0ZpbGUub3V0cHV0KSB7XG4gICAgICAgICAgICBDb25maWd1cmF0aW9uLm1haW5EYXRhLm91dHB1dCA9IGNvbmZpZ0ZpbGUub3V0cHV0O1xuICAgICAgICB9XG4gICAgICAgIGlmIChwcm9ncmFtLm91dHB1dCAmJiBwcm9ncmFtLm91dHB1dCAhPT0gQ09NUE9ET0NfREVGQVVMVFMuZm9sZGVyKSB7XG4gICAgICAgICAgICBDb25maWd1cmF0aW9uLm1haW5EYXRhLm91dHB1dCA9IHByb2dyYW0ub3V0cHV0O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbmZpZ0ZpbGUuZXh0VGhlbWUpIHtcbiAgICAgICAgICAgIENvbmZpZ3VyYXRpb24ubWFpbkRhdGEuZXh0VGhlbWUgPSBjb25maWdGaWxlLmV4dFRoZW1lO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwcm9ncmFtLmV4dFRoZW1lKSB7XG4gICAgICAgICAgICBDb25maWd1cmF0aW9uLm1haW5EYXRhLmV4dFRoZW1lID0gcHJvZ3JhbS5leHRUaGVtZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb25maWdGaWxlLmxhbmd1YWdlKSB7XG4gICAgICAgICAgICBDb25maWd1cmF0aW9uLm1haW5EYXRhLmxhbmd1YWdlID0gY29uZmlnRmlsZS5sYW5ndWFnZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJvZ3JhbS5sYW5ndWFnZSkge1xuICAgICAgICAgICAgQ29uZmlndXJhdGlvbi5tYWluRGF0YS5sYW5ndWFnZSA9IHByb2dyYW0ubGFuZ3VhZ2U7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnRmlsZS50aGVtZSkge1xuICAgICAgICAgICAgQ29uZmlndXJhdGlvbi5tYWluRGF0YS50aGVtZSA9IGNvbmZpZ0ZpbGUudGhlbWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByb2dyYW0udGhlbWUpIHtcbiAgICAgICAgICAgIENvbmZpZ3VyYXRpb24ubWFpbkRhdGEudGhlbWUgPSBwcm9ncmFtLnRoZW1lO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbmZpZ0ZpbGUubmFtZSkge1xuICAgICAgICAgICAgQ29uZmlndXJhdGlvbi5tYWluRGF0YS5kb2N1bWVudGF0aW9uTWFpbk5hbWUgPSBjb25maWdGaWxlLm5hbWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByb2dyYW0ubmFtZSAmJiBwcm9ncmFtLm5hbWUgIT09IENPTVBPRE9DX0RFRkFVTFRTLnRpdGxlKSB7XG4gICAgICAgICAgICBDb25maWd1cmF0aW9uLm1haW5EYXRhLmRvY3VtZW50YXRpb25NYWluTmFtZSA9IHByb2dyYW0ubmFtZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb25maWdGaWxlLmFzc2V0c0ZvbGRlcikge1xuICAgICAgICAgICAgQ29uZmlndXJhdGlvbi5tYWluRGF0YS5hc3NldHNGb2xkZXIgPSBjb25maWdGaWxlLmFzc2V0c0ZvbGRlcjtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJvZ3JhbS5hc3NldHNGb2xkZXIpIHtcbiAgICAgICAgICAgIENvbmZpZ3VyYXRpb24ubWFpbkRhdGEuYXNzZXRzRm9sZGVyID0gcHJvZ3JhbS5hc3NldHNGb2xkZXI7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnRmlsZS5vcGVuKSB7XG4gICAgICAgICAgICBDb25maWd1cmF0aW9uLm1haW5EYXRhLm9wZW4gPSBjb25maWdGaWxlLm9wZW47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByb2dyYW0ub3Blbikge1xuICAgICAgICAgICAgQ29uZmlndXJhdGlvbi5tYWluRGF0YS5vcGVuID0gcHJvZ3JhbS5vcGVuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbmZpZ0ZpbGUudG9nZ2xlTWVudUl0ZW1zKSB7XG4gICAgICAgICAgICBDb25maWd1cmF0aW9uLm1haW5EYXRhLnRvZ2dsZU1lbnVJdGVtcyA9IGNvbmZpZ0ZpbGUudG9nZ2xlTWVudUl0ZW1zO1xuICAgICAgICB9XG4gICAgICAgIGlmIChcbiAgICAgICAgICAgIHByb2dyYW0udG9nZ2xlTWVudUl0ZW1zICYmXG4gICAgICAgICAgICBwcm9ncmFtLnRvZ2dsZU1lbnVJdGVtcyAhPT0gQ09NUE9ET0NfREVGQVVMVFMudG9nZ2xlTWVudUl0ZW1zXG4gICAgICAgICkge1xuICAgICAgICAgICAgQ29uZmlndXJhdGlvbi5tYWluRGF0YS50b2dnbGVNZW51SXRlbXMgPSBwcm9ncmFtLnRvZ2dsZU1lbnVJdGVtcztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb25maWdGaWxlLnRlbXBsYXRlcykge1xuICAgICAgICAgICAgQ29uZmlndXJhdGlvbi5tYWluRGF0YS50ZW1wbGF0ZXMgPSBjb25maWdGaWxlLnRlbXBsYXRlcztcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJvZ3JhbS50ZW1wbGF0ZXMpIHtcbiAgICAgICAgICAgIENvbmZpZ3VyYXRpb24ubWFpbkRhdGEudGVtcGxhdGVzID0gcHJvZ3JhbS50ZW1wbGF0ZXM7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnRmlsZS5uYXZUYWJDb25maWcpIHtcbiAgICAgICAgICAgIENvbmZpZ3VyYXRpb24ubWFpbkRhdGEubmF2VGFiQ29uZmlnID0gY29uZmlnRmlsZS5uYXZUYWJDb25maWc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKFxuICAgICAgICAgICAgcHJvZ3JhbS5uYXZUYWJDb25maWcgJiZcbiAgICAgICAgICAgIEpTT04ucGFyc2UocHJvZ3JhbS5uYXZUYWJDb25maWcpLmxlbmd0aCAhPT0gQ09NUE9ET0NfREVGQVVMVFMubmF2VGFiQ29uZmlnLmxlbmd0aFxuICAgICAgICApIHtcbiAgICAgICAgICAgIENvbmZpZ3VyYXRpb24ubWFpbkRhdGEubmF2VGFiQ29uZmlnID0gSlNPTi5wYXJzZShwcm9ncmFtLm5hdlRhYkNvbmZpZyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnRmlsZS5pbmNsdWRlcykge1xuICAgICAgICAgICAgQ29uZmlndXJhdGlvbi5tYWluRGF0YS5pbmNsdWRlcyA9IGNvbmZpZ0ZpbGUuaW5jbHVkZXM7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByb2dyYW0uaW5jbHVkZXMpIHtcbiAgICAgICAgICAgIENvbmZpZ3VyYXRpb24ubWFpbkRhdGEuaW5jbHVkZXMgPSBwcm9ncmFtLmluY2x1ZGVzO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbmZpZ0ZpbGUuaW5jbHVkZXNOYW1lKSB7XG4gICAgICAgICAgICBDb25maWd1cmF0aW9uLm1haW5EYXRhLmluY2x1ZGVzTmFtZSA9IGNvbmZpZ0ZpbGUuaW5jbHVkZXNOYW1lO1xuICAgICAgICB9XG4gICAgICAgIGlmIChcbiAgICAgICAgICAgIHByb2dyYW0uaW5jbHVkZXNOYW1lICYmXG4gICAgICAgICAgICBwcm9ncmFtLmluY2x1ZGVzTmFtZSAhPT0gQ09NUE9ET0NfREVGQVVMVFMuYWRkaXRpb25hbEVudHJ5TmFtZVxuICAgICAgICApIHtcbiAgICAgICAgICAgIENvbmZpZ3VyYXRpb24ubWFpbkRhdGEuaW5jbHVkZXNOYW1lID0gcHJvZ3JhbS5pbmNsdWRlc05hbWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnRmlsZS5zaWxlbnQpIHtcbiAgICAgICAgICAgIGxvZ2dlci5zaWxlbnQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJvZ3JhbS5zaWxlbnQpIHtcbiAgICAgICAgICAgIGxvZ2dlci5zaWxlbnQgPSBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb25maWdGaWxlLnNlcnZlKSB7XG4gICAgICAgICAgICBDb25maWd1cmF0aW9uLm1haW5EYXRhLnNlcnZlID0gY29uZmlnRmlsZS5zZXJ2ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJvZ3JhbS5zZXJ2ZSkge1xuICAgICAgICAgICAgQ29uZmlndXJhdGlvbi5tYWluRGF0YS5zZXJ2ZSA9IHByb2dyYW0uc2VydmU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnRmlsZS5ob3N0KSB7XG4gICAgICAgICAgICBDb25maWd1cmF0aW9uLm1haW5EYXRhLmhvc3QgPSBjb25maWdGaWxlLmhvc3Q7XG4gICAgICAgICAgICBDb25maWd1cmF0aW9uLm1haW5EYXRhLmhvc3RuYW1lID0gY29uZmlnRmlsZS5ob3N0O1xuICAgICAgICB9XG4gICAgICAgIGlmIChwcm9ncmFtLmhvc3QpIHtcbiAgICAgICAgICAgIENvbmZpZ3VyYXRpb24ubWFpbkRhdGEuaG9zdCA9IHByb2dyYW0uaG9zdDtcbiAgICAgICAgICAgIENvbmZpZ3VyYXRpb24ubWFpbkRhdGEuaG9zdG5hbWUgPSBwcm9ncmFtLmhvc3Q7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnRmlsZS5wb3J0KSB7XG4gICAgICAgICAgICBDb25maWd1cmF0aW9uLm1haW5EYXRhLnBvcnQgPSBjb25maWdGaWxlLnBvcnQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByb2dyYW0ucG9ydCAmJiBwcm9ncmFtLnBvcnQgIT09IENPTVBPRE9DX0RFRkFVTFRTLnBvcnQpIHtcbiAgICAgICAgICAgIENvbmZpZ3VyYXRpb24ubWFpbkRhdGEucG9ydCA9IHByb2dyYW0ucG9ydDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb25maWdGaWxlLndhdGNoKSB7XG4gICAgICAgICAgICBDb25maWd1cmF0aW9uLm1haW5EYXRhLndhdGNoID0gY29uZmlnRmlsZS53YXRjaDtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJvZ3JhbS53YXRjaCkge1xuICAgICAgICAgICAgQ29uZmlndXJhdGlvbi5tYWluRGF0YS53YXRjaCA9IHByb2dyYW0ud2F0Y2g7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnRmlsZS5leHBvcnRGb3JtYXQpIHtcbiAgICAgICAgICAgIENvbmZpZ3VyYXRpb24ubWFpbkRhdGEuZXhwb3J0Rm9ybWF0ID0gY29uZmlnRmlsZS5leHBvcnRGb3JtYXQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByb2dyYW0uZXhwb3J0Rm9ybWF0ICYmIHByb2dyYW0uZXhwb3J0Rm9ybWF0ICE9PSBDT01QT0RPQ19ERUZBVUxUUy5leHBvcnRGb3JtYXQpIHtcbiAgICAgICAgICAgIENvbmZpZ3VyYXRpb24ubWFpbkRhdGEuZXhwb3J0Rm9ybWF0ID0gcHJvZ3JhbS5leHBvcnRGb3JtYXQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnRmlsZS5oaWRlR2VuZXJhdG9yKSB7XG4gICAgICAgICAgICBDb25maWd1cmF0aW9uLm1haW5EYXRhLmhpZGVHZW5lcmF0b3IgPSBjb25maWdGaWxlLmhpZGVHZW5lcmF0b3I7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByb2dyYW0uaGlkZUdlbmVyYXRvcikge1xuICAgICAgICAgICAgQ29uZmlndXJhdGlvbi5tYWluRGF0YS5oaWRlR2VuZXJhdG9yID0gcHJvZ3JhbS5oaWRlR2VuZXJhdG9yO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbmZpZ0ZpbGUuY292ZXJhZ2VUZXN0KSB7XG4gICAgICAgICAgICBDb25maWd1cmF0aW9uLm1haW5EYXRhLmNvdmVyYWdlVGVzdCA9IHRydWU7XG4gICAgICAgICAgICBDb25maWd1cmF0aW9uLm1haW5EYXRhLmNvdmVyYWdlVGVzdFRocmVzaG9sZCA9XG4gICAgICAgICAgICAgICAgdHlwZW9mIGNvbmZpZ0ZpbGUuY292ZXJhZ2VUZXN0ID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgICAgICAgICA/IHBhcnNlSW50KGNvbmZpZ0ZpbGUuY292ZXJhZ2VUZXN0LCAxMClcbiAgICAgICAgICAgICAgICAgICAgOiBDT01QT0RPQ19ERUZBVUxUUy5kZWZhdWx0Q292ZXJhZ2VUaHJlc2hvbGQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByb2dyYW0uY292ZXJhZ2VUZXN0KSB7XG4gICAgICAgICAgICBDb25maWd1cmF0aW9uLm1haW5EYXRhLmNvdmVyYWdlVGVzdCA9IHRydWU7XG4gICAgICAgICAgICBDb25maWd1cmF0aW9uLm1haW5EYXRhLmNvdmVyYWdlVGVzdFRocmVzaG9sZCA9XG4gICAgICAgICAgICAgICAgdHlwZW9mIHByb2dyYW0uY292ZXJhZ2VUZXN0ID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgICAgICAgICA/IHBhcnNlSW50KHByb2dyYW0uY292ZXJhZ2VUZXN0LCAxMClcbiAgICAgICAgICAgICAgICAgICAgOiBDT01QT0RPQ19ERUZBVUxUUy5kZWZhdWx0Q292ZXJhZ2VUaHJlc2hvbGQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnRmlsZS5jb3ZlcmFnZU1pbmltdW1QZXJGaWxlKSB7XG4gICAgICAgICAgICBDb25maWd1cmF0aW9uLm1haW5EYXRhLmNvdmVyYWdlVGVzdFBlckZpbGUgPSB0cnVlO1xuICAgICAgICAgICAgQ29uZmlndXJhdGlvbi5tYWluRGF0YS5jb3ZlcmFnZU1pbmltdW1QZXJGaWxlID1cbiAgICAgICAgICAgICAgICB0eXBlb2YgY29uZmlnRmlsZS5jb3ZlcmFnZU1pbmltdW1QZXJGaWxlID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgICAgICAgICA/IHBhcnNlSW50KGNvbmZpZ0ZpbGUuY292ZXJhZ2VNaW5pbXVtUGVyRmlsZSwgMTApXG4gICAgICAgICAgICAgICAgICAgIDogQ09NUE9ET0NfREVGQVVMVFMuZGVmYXVsdENvdmVyYWdlTWluaW11bVBlckZpbGU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByb2dyYW0uY292ZXJhZ2VNaW5pbXVtUGVyRmlsZSkge1xuICAgICAgICAgICAgQ29uZmlndXJhdGlvbi5tYWluRGF0YS5jb3ZlcmFnZVRlc3RQZXJGaWxlID0gdHJ1ZTtcbiAgICAgICAgICAgIENvbmZpZ3VyYXRpb24ubWFpbkRhdGEuY292ZXJhZ2VNaW5pbXVtUGVyRmlsZSA9XG4gICAgICAgICAgICAgICAgdHlwZW9mIHByb2dyYW0uY292ZXJhZ2VNaW5pbXVtUGVyRmlsZSA9PT0gJ3N0cmluZydcbiAgICAgICAgICAgICAgICAgICAgPyBwYXJzZUludChwcm9ncmFtLmNvdmVyYWdlTWluaW11bVBlckZpbGUsIDEwKVxuICAgICAgICAgICAgICAgICAgICA6IENPTVBPRE9DX0RFRkFVTFRTLmRlZmF1bHRDb3ZlcmFnZU1pbmltdW1QZXJGaWxlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbmZpZ0ZpbGUuY292ZXJhZ2VUZXN0VGhyZXNob2xkRmFpbCkge1xuICAgICAgICAgICAgQ29uZmlndXJhdGlvbi5tYWluRGF0YS5jb3ZlcmFnZVRlc3RUaHJlc2hvbGRGYWlsID1cbiAgICAgICAgICAgICAgICBjb25maWdGaWxlLmNvdmVyYWdlVGVzdFRocmVzaG9sZEZhaWwgPT09ICdmYWxzZScgPyBmYWxzZSA6IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByb2dyYW0uY292ZXJhZ2VUZXN0VGhyZXNob2xkRmFpbCkge1xuICAgICAgICAgICAgQ29uZmlndXJhdGlvbi5tYWluRGF0YS5jb3ZlcmFnZVRlc3RUaHJlc2hvbGRGYWlsID1cbiAgICAgICAgICAgICAgICBwcm9ncmFtLmNvdmVyYWdlVGVzdFRocmVzaG9sZEZhaWwgPT09ICdmYWxzZScgPyBmYWxzZSA6IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnRmlsZS5jb3ZlcmFnZVRlc3RTaG93T25seUZhaWxlZCkge1xuICAgICAgICAgICAgQ29uZmlndXJhdGlvbi5tYWluRGF0YS5jb3ZlcmFnZVRlc3RTaG93T25seUZhaWxlZCA9XG4gICAgICAgICAgICAgICAgY29uZmlnRmlsZS5jb3ZlcmFnZVRlc3RTaG93T25seUZhaWxlZDtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJvZ3JhbS5jb3ZlcmFnZVRlc3RTaG93T25seUZhaWxlZCkge1xuICAgICAgICAgICAgQ29uZmlndXJhdGlvbi5tYWluRGF0YS5jb3ZlcmFnZVRlc3RTaG93T25seUZhaWxlZCA9IHByb2dyYW0uY292ZXJhZ2VUZXN0U2hvd09ubHlGYWlsZWQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnRmlsZS51bml0VGVzdENvdmVyYWdlKSB7XG4gICAgICAgICAgICBDb25maWd1cmF0aW9uLm1haW5EYXRhLnVuaXRUZXN0Q292ZXJhZ2UgPSBjb25maWdGaWxlLnVuaXRUZXN0Q292ZXJhZ2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByb2dyYW0udW5pdFRlc3RDb3ZlcmFnZSkge1xuICAgICAgICAgICAgQ29uZmlndXJhdGlvbi5tYWluRGF0YS51bml0VGVzdENvdmVyYWdlID0gcHJvZ3JhbS51bml0VGVzdENvdmVyYWdlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbmZpZ0ZpbGUuZGlzYWJsZVNvdXJjZUNvZGUpIHtcbiAgICAgICAgICAgIENvbmZpZ3VyYXRpb24ubWFpbkRhdGEuZGlzYWJsZVNvdXJjZUNvZGUgPSBjb25maWdGaWxlLmRpc2FibGVTb3VyY2VDb2RlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwcm9ncmFtLmRpc2FibGVTb3VyY2VDb2RlKSB7XG4gICAgICAgICAgICBDb25maWd1cmF0aW9uLm1haW5EYXRhLmRpc2FibGVTb3VyY2VDb2RlID0gcHJvZ3JhbS5kaXNhYmxlU291cmNlQ29kZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb25maWdGaWxlLmRpc2FibGVEb21UcmVlKSB7XG4gICAgICAgICAgICBDb25maWd1cmF0aW9uLm1haW5EYXRhLmRpc2FibGVEb21UcmVlID0gY29uZmlnRmlsZS5kaXNhYmxlRG9tVHJlZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJvZ3JhbS5kaXNhYmxlRG9tVHJlZSkge1xuICAgICAgICAgICAgQ29uZmlndXJhdGlvbi5tYWluRGF0YS5kaXNhYmxlRG9tVHJlZSA9IHByb2dyYW0uZGlzYWJsZURvbVRyZWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnRmlsZS5kaXNhYmxlVGVtcGxhdGVUYWIpIHtcbiAgICAgICAgICAgIENvbmZpZ3VyYXRpb24ubWFpbkRhdGEuZGlzYWJsZVRlbXBsYXRlVGFiID0gY29uZmlnRmlsZS5kaXNhYmxlVGVtcGxhdGVUYWI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByb2dyYW0uZGlzYWJsZVRlbXBsYXRlVGFiKSB7XG4gICAgICAgICAgICBDb25maWd1cmF0aW9uLm1haW5EYXRhLmRpc2FibGVUZW1wbGF0ZVRhYiA9IHByb2dyYW0uZGlzYWJsZVRlbXBsYXRlVGFiO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbmZpZ0ZpbGUuZGlzYWJsZVN0eWxlVGFiKSB7XG4gICAgICAgICAgICBDb25maWd1cmF0aW9uLm1haW5EYXRhLmRpc2FibGVTdHlsZVRhYiA9IGNvbmZpZ0ZpbGUuZGlzYWJsZVN0eWxlVGFiO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwcm9ncmFtLmRpc2FibGVTdHlsZVRhYikge1xuICAgICAgICAgICAgQ29uZmlndXJhdGlvbi5tYWluRGF0YS5kaXNhYmxlU3R5bGVUYWIgPSBwcm9ncmFtLmRpc2FibGVTdHlsZVRhYjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb25maWdGaWxlLmRpc2FibGVHcmFwaCkge1xuICAgICAgICAgICAgQ29uZmlndXJhdGlvbi5tYWluRGF0YS5kaXNhYmxlR3JhcGggPSBjb25maWdGaWxlLmRpc2FibGVHcmFwaDtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJvZ3JhbS5kaXNhYmxlR3JhcGgpIHtcbiAgICAgICAgICAgIENvbmZpZ3VyYXRpb24ubWFpbkRhdGEuZGlzYWJsZUdyYXBoID0gcHJvZ3JhbS5kaXNhYmxlR3JhcGg7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnRmlsZS5kaXNhYmxlQ292ZXJhZ2UpIHtcbiAgICAgICAgICAgIENvbmZpZ3VyYXRpb24ubWFpbkRhdGEuZGlzYWJsZUNvdmVyYWdlID0gY29uZmlnRmlsZS5kaXNhYmxlQ292ZXJhZ2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByb2dyYW0uZGlzYWJsZUNvdmVyYWdlKSB7XG4gICAgICAgICAgICBDb25maWd1cmF0aW9uLm1haW5EYXRhLmRpc2FibGVDb3ZlcmFnZSA9IHByb2dyYW0uZGlzYWJsZUNvdmVyYWdlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbmZpZ0ZpbGUuZGlzYWJsZVByaXZhdGUpIHtcbiAgICAgICAgICAgIENvbmZpZ3VyYXRpb24ubWFpbkRhdGEuZGlzYWJsZVByaXZhdGUgPSBjb25maWdGaWxlLmRpc2FibGVQcml2YXRlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwcm9ncmFtLmRpc2FibGVQcml2YXRlKSB7XG4gICAgICAgICAgICBDb25maWd1cmF0aW9uLm1haW5EYXRhLmRpc2FibGVQcml2YXRlID0gcHJvZ3JhbS5kaXNhYmxlUHJpdmF0ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb25maWdGaWxlLmRpc2FibGVQcm90ZWN0ZWQpIHtcbiAgICAgICAgICAgIENvbmZpZ3VyYXRpb24ubWFpbkRhdGEuZGlzYWJsZVByb3RlY3RlZCA9IGNvbmZpZ0ZpbGUuZGlzYWJsZVByb3RlY3RlZDtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJvZ3JhbS5kaXNhYmxlUHJvdGVjdGVkKSB7XG4gICAgICAgICAgICBDb25maWd1cmF0aW9uLm1haW5EYXRhLmRpc2FibGVQcm90ZWN0ZWQgPSBwcm9ncmFtLmRpc2FibGVQcm90ZWN0ZWQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnRmlsZS5kaXNhYmxlSW50ZXJuYWwpIHtcbiAgICAgICAgICAgIENvbmZpZ3VyYXRpb24ubWFpbkRhdGEuZGlzYWJsZUludGVybmFsID0gY29uZmlnRmlsZS5kaXNhYmxlSW50ZXJuYWw7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByb2dyYW0uZGlzYWJsZUludGVybmFsKSB7XG4gICAgICAgICAgICBDb25maWd1cmF0aW9uLm1haW5EYXRhLmRpc2FibGVJbnRlcm5hbCA9IHByb2dyYW0uZGlzYWJsZUludGVybmFsO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbmZpZ0ZpbGUuZGlzYWJsZUxpZmVDeWNsZUhvb2tzKSB7XG4gICAgICAgICAgICBDb25maWd1cmF0aW9uLm1haW5EYXRhLmRpc2FibGVMaWZlQ3ljbGVIb29rcyA9IGNvbmZpZ0ZpbGUuZGlzYWJsZUxpZmVDeWNsZUhvb2tzO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwcm9ncmFtLmRpc2FibGVMaWZlQ3ljbGVIb29rcykge1xuICAgICAgICAgICAgQ29uZmlndXJhdGlvbi5tYWluRGF0YS5kaXNhYmxlTGlmZUN5Y2xlSG9va3MgPSBwcm9ncmFtLmRpc2FibGVMaWZlQ3ljbGVIb29rcztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb25maWdGaWxlLmRpc2FibGVSb3V0ZXNHcmFwaCkge1xuICAgICAgICAgICAgQ29uZmlndXJhdGlvbi5tYWluRGF0YS5kaXNhYmxlUm91dGVzR3JhcGggPSBjb25maWdGaWxlLmRpc2FibGVSb3V0ZXNHcmFwaDtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJvZ3JhbS5kaXNhYmxlUm91dGVzR3JhcGgpIHtcbiAgICAgICAgICAgIENvbmZpZ3VyYXRpb24ubWFpbkRhdGEuZGlzYWJsZVJvdXRlc0dyYXBoID0gcHJvZ3JhbS5kaXNhYmxlUm91dGVzR3JhcGg7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnRmlsZS5kaXNhYmxlU2VhcmNoKSB7XG4gICAgICAgICAgICBDb25maWd1cmF0aW9uLm1haW5EYXRhLmRpc2FibGVTZWFyY2ggPSBjb25maWdGaWxlLmRpc2FibGVTZWFyY2g7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByb2dyYW0uZGlzYWJsZVNlYXJjaCkge1xuICAgICAgICAgICAgQ29uZmlndXJhdGlvbi5tYWluRGF0YS5kaXNhYmxlU2VhcmNoID0gcHJvZ3JhbS5kaXNhYmxlU2VhcmNoO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbmZpZ0ZpbGUuZGlzYWJsZURlcGVuZGVuY2llcykge1xuICAgICAgICAgICAgQ29uZmlndXJhdGlvbi5tYWluRGF0YS5kaXNhYmxlRGVwZW5kZW5jaWVzID0gY29uZmlnRmlsZS5kaXNhYmxlRGVwZW5kZW5jaWVzO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwcm9ncmFtLmRpc2FibGVEZXBlbmRlbmNpZXMpIHtcbiAgICAgICAgICAgIENvbmZpZ3VyYXRpb24ubWFpbkRhdGEuZGlzYWJsZURlcGVuZGVuY2llcyA9IHByb2dyYW0uZGlzYWJsZURlcGVuZGVuY2llcztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb25maWdGaWxlLm1pbmltYWwpIHtcbiAgICAgICAgICAgIENvbmZpZ3VyYXRpb24ubWFpbkRhdGEuZGlzYWJsZVNlYXJjaCA9IHRydWU7XG4gICAgICAgICAgICBDb25maWd1cmF0aW9uLm1haW5EYXRhLmRpc2FibGVSb3V0ZXNHcmFwaCA9IHRydWU7XG4gICAgICAgICAgICBDb25maWd1cmF0aW9uLm1haW5EYXRhLmRpc2FibGVHcmFwaCA9IHRydWU7XG4gICAgICAgICAgICBDb25maWd1cmF0aW9uLm1haW5EYXRhLmRpc2FibGVDb3ZlcmFnZSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByb2dyYW0ubWluaW1hbCkge1xuICAgICAgICAgICAgQ29uZmlndXJhdGlvbi5tYWluRGF0YS5kaXNhYmxlU2VhcmNoID0gdHJ1ZTtcbiAgICAgICAgICAgIENvbmZpZ3VyYXRpb24ubWFpbkRhdGEuZGlzYWJsZVJvdXRlc0dyYXBoID0gdHJ1ZTtcbiAgICAgICAgICAgIENvbmZpZ3VyYXRpb24ubWFpbkRhdGEuZGlzYWJsZUdyYXBoID0gdHJ1ZTtcbiAgICAgICAgICAgIENvbmZpZ3VyYXRpb24ubWFpbkRhdGEuZGlzYWJsZUNvdmVyYWdlID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb25maWdGaWxlLmN1c3RvbUZhdmljb24pIHtcbiAgICAgICAgICAgIENvbmZpZ3VyYXRpb24ubWFpbkRhdGEuY3VzdG9tRmF2aWNvbiA9IGNvbmZpZ0ZpbGUuY3VzdG9tRmF2aWNvbjtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJvZ3JhbS5jdXN0b21GYXZpY29uKSB7XG4gICAgICAgICAgICBDb25maWd1cmF0aW9uLm1haW5EYXRhLmN1c3RvbUZhdmljb24gPSBwcm9ncmFtLmN1c3RvbUZhdmljb247XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnRmlsZS5jdXN0b21Mb2dvKSB7XG4gICAgICAgICAgICBDb25maWd1cmF0aW9uLm1haW5EYXRhLmN1c3RvbUxvZ28gPSBjb25maWdGaWxlLmN1c3RvbUxvZ287XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByb2dyYW0uY3VzdG9tTG9nbykge1xuICAgICAgICAgICAgQ29uZmlndXJhdGlvbi5tYWluRGF0YS5jdXN0b21Mb2dvID0gcHJvZ3JhbS5jdXN0b21Mb2dvO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbmZpZ0ZpbGUuZ2FJRCkge1xuICAgICAgICAgICAgQ29uZmlndXJhdGlvbi5tYWluRGF0YS5nYUlEID0gY29uZmlnRmlsZS5nYUlEO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwcm9ncmFtLmdhSUQpIHtcbiAgICAgICAgICAgIENvbmZpZ3VyYXRpb24ubWFpbkRhdGEuZ2FJRCA9IHByb2dyYW0uZ2FJRDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb25maWdGaWxlLmdhU2l0ZSkge1xuICAgICAgICAgICAgQ29uZmlndXJhdGlvbi5tYWluRGF0YS5nYVNpdGUgPSBjb25maWdGaWxlLmdhU2l0ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJvZ3JhbS5nYVNpdGUgJiYgcHJvZ3JhbS5nYVNpdGUgIT09IENPTVBPRE9DX0RFRkFVTFRTLmdhU2l0ZSkge1xuICAgICAgICAgICAgQ29uZmlndXJhdGlvbi5tYWluRGF0YS5nYVNpdGUgPSBwcm9ncmFtLmdhU2l0ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdGhpcy5pc1dhdGNoaW5nKSB7XG4gICAgICAgICAgICBpZiAoIWxvZ2dlci5zaWxlbnQpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgQ29tcG9kb2MgdiR7cGtnLnZlcnNpb259YCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGZzLnJlYWRGaWxlU3luYyhwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vc3JjL2Jhbm5lcicpKS50b1N0cmluZygpKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhwa2cudmVyc2lvbik7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJycpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBUeXBlU2NyaXB0IHZlcnNpb24gdXNlZCBieSBDb21wb2RvYyA6ICR7dHMudmVyc2lvbn1gKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnJyk7XG5cbiAgICAgICAgICAgICAgICBpZiAoRmlsZUVuZ2luZS5leGlzdHNTeW5jKGN3ZCArIHBhdGguc2VwICsgJ3BhY2thZ2UuanNvbicpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhY2thZ2VEYXRhID0gRmlsZUVuZ2luZS5nZXRTeW5jKGN3ZCArIHBhdGguc2VwICsgJ3BhY2thZ2UuanNvbicpO1xuICAgICAgICAgICAgICAgICAgICBpZiAocGFja2FnZURhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhcnNlZERhdGEgPSBKU09OLnBhcnNlKHBhY2thZ2VEYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb2plY3REZXZEZXBlbmRlbmNpZXMgPSBwYXJzZWREYXRhLmRldkRlcGVuZGVuY2llcztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcm9qZWN0RGV2RGVwZW5kZW5jaWVzICYmIHByb2plY3REZXZEZXBlbmRlbmNpZXMudHlwZXNjcmlwdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRzUHJvamVjdFZlcnNpb24gPSBBbmd1bGFyVmVyc2lvblV0aWwuY2xlYW5WZXJzaW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9qZWN0RGV2RGVwZW5kZW5jaWVzLnR5cGVzY3JpcHRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBgVHlwZVNjcmlwdCB2ZXJzaW9uIG9mIGN1cnJlbnQgcHJvamVjdCA6ICR7dHNQcm9qZWN0VmVyc2lvbn1gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYE5vZGUuanMgdmVyc2lvbiA6ICR7cHJvY2Vzcy52ZXJzaW9ufWApO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCcnKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgT3BlcmF0aW5nIHN5c3RlbSA6ICR7b3NOYW1lKG9zLnBsYXRmb3JtKCksIG9zLnJlbGVhc2UoKSl9YCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbmZpZ0V4cGxvcmVyUmVzdWx0KSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGNvbmZpZ0V4cGxvcmVyUmVzdWx0LmNvbmZpZyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhgVXNpbmcgY29uZmlndXJhdGlvbiBmaWxlIDogJHtjb25maWdFeHBsb3JlclJlc3VsdC5maWxlcGF0aH1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghY29uZmlnRXhwbG9yZXJSZXN1bHQpIHtcbiAgICAgICAgICAgIGxvZ2dlci53YXJuKGBObyBjb25maWd1cmF0aW9uIGZpbGUgZm91bmQsIHN3aXRjaGluZyB0byBDTEkgZmxhZ3MuYCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocHJvZ3JhbS5sYW5ndWFnZSAmJiAhSTE4bkVuZ2luZS5zdXBwb3J0TGFuZ3VhZ2UocHJvZ3JhbS5sYW5ndWFnZSkpIHtcbiAgICAgICAgICAgIGxvZ2dlci53YXJuKFxuICAgICAgICAgICAgICAgIGBUaGUgbGFuZ3VhZ2UgJHtwcm9ncmFtLmxhbmd1YWdlfSBpcyBub3QgYXZhaWxhYmxlLCBmYWxsaW5nIGJhY2sgdG8gJHtJMThuRW5naW5lLmZhbGxiYWNrTGFuZ3VhZ2V9YFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwcm9ncmFtLnRzY29uZmlnICYmIHR5cGVvZiBwcm9ncmFtLnRzY29uZmlnID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihgUGxlYXNlIHByb3ZpZGUgYSB0c2NvbmZpZyBmaWxlLmApO1xuICAgICAgICAgICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbmZpZ0ZpbGUudHNjb25maWcpIHtcbiAgICAgICAgICAgIENvbmZpZ3VyYXRpb24ubWFpbkRhdGEudHNjb25maWcgPSBjb25maWdGaWxlLnRzY29uZmlnO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwcm9ncmFtLnRzY29uZmlnKSB7XG4gICAgICAgICAgICBDb25maWd1cmF0aW9uLm1haW5EYXRhLnRzY29uZmlnID0gcHJvZ3JhbS50c2NvbmZpZztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwcm9ncmFtLm1heFNlYXJjaFJlc3VsdHMpIHtcbiAgICAgICAgICAgIENvbmZpZ3VyYXRpb24ubWFpbkRhdGEubWF4U2VhcmNoUmVzdWx0cyA9IHByb2dyYW0ubWF4U2VhcmNoUmVzdWx0cztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb25maWdGaWxlLmZpbGVzKSB7XG4gICAgICAgICAgICBzY2FubmVkRmlsZXMgPSBjb25maWdGaWxlLmZpbGVzO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb25maWdGaWxlLmV4Y2x1ZGUpIHtcbiAgICAgICAgICAgIGV4Y2x1ZGVGaWxlcyA9IGNvbmZpZ0ZpbGUuZXhjbHVkZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29uZmlnRmlsZS5pbmNsdWRlKSB7XG4gICAgICAgICAgICBpbmNsdWRlRmlsZXMgPSBjb25maWdGaWxlLmluY2x1ZGU7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogQ2hlY2sgLS1maWxlcyBhcmd1bWVudCBjYWxsXG4gICAgICAgICAqL1xuICAgICAgICBjb25zdCBhcmd2ID0gcmVxdWlyZSgnbWluaW1pc3QnKShwcm9jZXNzLmFyZ3Yuc2xpY2UoMikpO1xuICAgICAgICBpZiAoYXJndiAmJiBhcmd2LmZpbGVzKSB7XG4gICAgICAgICAgICBDb25maWd1cmF0aW9uLm1haW5EYXRhLmhhc0ZpbGVzVG9Db3ZlcmFnZSA9IHRydWU7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGFyZ3YuZmlsZXMgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgc3VwZXIuc2V0RmlsZXMoW2FyZ3YuZmlsZXNdKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3VwZXIuc2V0RmlsZXMoYXJndi5maWxlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocHJvZ3JhbS5zZXJ2ZSAmJiAhQ29uZmlndXJhdGlvbi5tYWluRGF0YS50c2NvbmZpZyAmJiBwcm9ncmFtLm91dHB1dCkge1xuICAgICAgICAgICAgLy8gaWYgLXMgJiAtZCwgc2VydmUgaXRcbiAgICAgICAgICAgIGlmICghRmlsZUVuZ2luZS5leGlzdHNTeW5jKENvbmZpZ3VyYXRpb24ubWFpbkRhdGEub3V0cHV0KSkge1xuICAgICAgICAgICAgICAgIGxvZ2dlci5lcnJvcihgJHtDb25maWd1cmF0aW9uLm1haW5EYXRhLm91dHB1dH0gZm9sZGVyIGRvZXNuJ3QgZXhpc3RgKTtcbiAgICAgICAgICAgICAgICBwcm9jZXNzLmV4aXQoMSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKFxuICAgICAgICAgICAgICAgICAgICBgU2VydmluZyBkb2N1bWVudGF0aW9uIGZyb20gJHtDb25maWd1cmF0aW9uLm1haW5EYXRhLm91dHB1dH0gYXQgaHR0cDovLyR7Q29uZmlndXJhdGlvbi5tYWluRGF0YS5ob3N0bmFtZX06JHtwcm9ncmFtLnBvcnR9YFxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgc3VwZXIucnVuV2ViU2VydmVyKENvbmZpZ3VyYXRpb24ubWFpbkRhdGEub3V0cHV0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChwcm9ncmFtLnNlcnZlICYmICFDb25maWd1cmF0aW9uLm1haW5EYXRhLnRzY29uZmlnICYmICFwcm9ncmFtLm91dHB1dCkge1xuICAgICAgICAgICAgLy8gaWYgb25seSAtcyBmaW5kIC4vZG9jdW1lbnRhdGlvbiwgaWYgb2sgc2VydmUsIGVsc2UgZXJyb3IgcHJvdmlkZSAtZFxuICAgICAgICAgICAgaWYgKCFGaWxlRW5naW5lLmV4aXN0c1N5bmMoQ29uZmlndXJhdGlvbi5tYWluRGF0YS5vdXRwdXQpKSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmVycm9yKCdQcm92aWRlIG91dHB1dCBnZW5lcmF0ZWQgZm9sZGVyIHdpdGggLWQgZmxhZycpO1xuICAgICAgICAgICAgICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oXG4gICAgICAgICAgICAgICAgICAgIGBTZXJ2aW5nIGRvY3VtZW50YXRpb24gZnJvbSAke0NvbmZpZ3VyYXRpb24ubWFpbkRhdGEub3V0cHV0fSBhdCBodHRwOi8vJHtDb25maWd1cmF0aW9uLm1haW5EYXRhLmhvc3RuYW1lfToke3Byb2dyYW0ucG9ydH1gXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBzdXBlci5ydW5XZWJTZXJ2ZXIoQ29uZmlndXJhdGlvbi5tYWluRGF0YS5vdXRwdXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKENvbmZpZ3VyYXRpb24ubWFpbkRhdGEuaGFzRmlsZXNUb0NvdmVyYWdlKSB7XG4gICAgICAgICAgICBpZiAocHJvZ3JhbS5jb3ZlcmFnZU1pbmltdW1QZXJGaWxlKSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oJ1J1biBkb2N1bWVudGF0aW9uIGNvdmVyYWdlIHRlc3QgZm9yIGZpbGVzJyk7XG4gICAgICAgICAgICAgICAgc3VwZXIudGVzdENvdmVyYWdlKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxvZ2dlci5lcnJvcignTWlzc2luZyBjb3ZlcmFnZSBjb25maWd1cmF0aW9uJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAocHJvZ3JhbS5oaWRlR2VuZXJhdG9yKSB7XG4gICAgICAgICAgICAgICAgQ29uZmlndXJhdGlvbi5tYWluRGF0YS5oaWRlR2VuZXJhdG9yID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKENvbmZpZ3VyYXRpb24ubWFpbkRhdGEudHNjb25maWcgJiYgcHJvZ3JhbS5hcmdzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIHRzY29uZmlnIGZpbGUgcHJvdmlkZWQgb25seVxuICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGxldCB0ZXN0VHNDb25maWdQYXRoID0gQ29uZmlndXJhdGlvbi5tYWluRGF0YS50c2NvbmZpZy5pbmRleE9mKHByb2Nlc3MuY3dkKCkpO1xuICAgICAgICAgICAgICAgIGlmICh0ZXN0VHNDb25maWdQYXRoICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICBDb25maWd1cmF0aW9uLm1haW5EYXRhLnRzY29uZmlnID0gQ29uZmlndXJhdGlvbi5tYWluRGF0YS50c2NvbmZpZy5yZXBsYWNlKFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzcy5jd2QoKSArIHBhdGguc2VwLFxuICAgICAgICAgICAgICAgICAgICAgICAgJydcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoIUZpbGVFbmdpbmUuZXhpc3RzU3luYyhDb25maWd1cmF0aW9uLm1haW5EYXRhLnRzY29uZmlnKSkge1xuICAgICAgICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAgICAgICAgICAgICBgXCIke0NvbmZpZ3VyYXRpb24ubWFpbkRhdGEudHNjb25maWd9XCIgZmlsZSB3YXMgbm90IGZvdW5kIGluIHRoZSBjdXJyZW50IGRpcmVjdG9yeWBcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBfZmlsZSA9IHBhdGguam9pbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGguam9pbihwcm9jZXNzLmN3ZCgpLCBwYXRoLmRpcm5hbWUoQ29uZmlndXJhdGlvbi5tYWluRGF0YS50c2NvbmZpZykpLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aC5iYXNlbmFtZShDb25maWd1cmF0aW9uLm1haW5EYXRhLnRzY29uZmlnKVxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAvLyB1c2UgdGhlIGN1cnJlbnQgZGlyZWN0b3J5IG9mIHRzY29uZmlnLmpzb24gYXMgYSB3b3JraW5nIGRpcmVjdG9yeVxuICAgICAgICAgICAgICAgICAgICBjd2QgPSBfZmlsZVxuICAgICAgICAgICAgICAgICAgICAgICAgLnNwbGl0KHBhdGguc2VwKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnNsaWNlKDAsIC0xKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmpvaW4ocGF0aC5zZXApO1xuICAgICAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbygnVXNpbmcgdHNjb25maWcgZmlsZSAnLCBfZmlsZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgbGV0IHRzQ29uZmlnRmlsZSA9IHJlYWRDb25maWcoX2ZpbGUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodHNDb25maWdGaWxlLmZpbGVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzY2FubmVkRmlsZXMgPSB0c0NvbmZpZ0ZpbGUuZmlsZXM7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBldmVuIGlmIGZpbGVzIGFyZSBzdXBwbGllZCB3aXRoIFwiZmlsZXNcIiBhdHRyaWJ1dGVzLCBlbmhhbmNlIHRoZSBhcnJheSB3aXRoIGluY2x1ZGVzXG4gICAgICAgICAgICAgICAgICAgIGV4Y2x1ZGVGaWxlcyA9IHRzQ29uZmlnRmlsZS5leGNsdWRlIHx8IFtdO1xuICAgICAgICAgICAgICAgICAgICBpbmNsdWRlRmlsZXMgPSB0c0NvbmZpZ0ZpbGUuaW5jbHVkZSB8fCBbXTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoc2Nhbm5lZEZpbGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluY2x1ZGVGaWxlcyA9IFsuLi5pbmNsdWRlRmlsZXMsIC4uLnNjYW5uZWRGaWxlc107XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBsZXQgZXhjbHVkZVBhcnNlciA9IG5ldyBQYXJzZXJVdGlsKCksXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmNsdWRlUGFyc2VyID0gbmV3IFBhcnNlclV0aWwoKTtcblxuICAgICAgICAgICAgICAgICAgICBleGNsdWRlUGFyc2VyLmluaXQoZXhjbHVkZUZpbGVzLCBjd2QpO1xuICAgICAgICAgICAgICAgICAgICBpbmNsdWRlUGFyc2VyLmluaXQoaW5jbHVkZUZpbGVzLCBjd2QpO1xuXG4gICAgICAgICAgICAgICAgICAgIGxldCBzdGFydEN3ZCA9IGN3ZDtcblxuICAgICAgICAgICAgICAgICAgICBsZXQgZXhjbHVkZVBhcnNlclRlc3RGaWxlc1dpdGhDd2REZXB0aCA9IGV4Y2x1ZGVQYXJzZXIudGVzdEZpbGVzV2l0aEN3ZERlcHRoKCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghZXhjbHVkZVBhcnNlclRlc3RGaWxlc1dpdGhDd2REZXB0aC5zdGF0dXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0Q3dkID0gZXhjbHVkZVBhcnNlci51cGRhdGVDd2QoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3dkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4Y2x1ZGVQYXJzZXJUZXN0RmlsZXNXaXRoQ3dkRGVwdGgubGV2ZWxcbiAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbGV0IGluY2x1ZGVQYXJzZXJUZXN0RmlsZXNXaXRoQ3dkRGVwdGggPSBpbmNsdWRlUGFyc2VyLnRlc3RGaWxlc1dpdGhDd2REZXB0aCgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWluY2x1ZGVQYXJzZXIudGVzdEZpbGVzV2l0aEN3ZERlcHRoKCkuc3RhdHVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydEN3ZCA9IGluY2x1ZGVQYXJzZXIudXBkYXRlQ3dkKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN3ZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmNsdWRlUGFyc2VyVGVzdEZpbGVzV2l0aEN3ZERlcHRoLmxldmVsXG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgbGV0IGZpbmRlciA9IHJlcXVpcmUoJ2ZpbmRpdDInKShzdGFydEN3ZCB8fCAnLicpO1xuXG4gICAgICAgICAgICAgICAgICAgIGZpbmRlci5vbignZGlyZWN0b3J5JywgZnVuY3Rpb24oZGlyLCBzdGF0LCBzdG9wKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgYmFzZSA9IHBhdGguYmFzZW5hbWUoZGlyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChiYXNlID09PSAnLmdpdCcgfHwgYmFzZSA9PT0gJ25vZGVfbW9kdWxlcycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdG9wKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIGZpbmRlci5vbignZmlsZScsIChmaWxlLCBzdGF0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoLyhzcGVjfFxcLmQpXFwudHMvLnRlc3QoZmlsZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIud2FybignSWdub3JpbmcnLCBmaWxlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZXhjbHVkZVBhcnNlci50ZXN0RmlsZShmaWxlKSAmJiBwYXRoLmV4dG5hbWUoZmlsZSkgPT09ICcudHMnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLndhcm4oJ0V4Y2x1ZGluZycsIGZpbGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpbmNsdWRlRmlsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqIElmIGluY2x1ZGUgcHJvdmlkZWQgaW4gdHNjb25maWcsIHVzZSBvbmx5IHRoaXMgc291cmNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqIGFuZCBub3QgZmlsZXMgZm91bmQgd2l0aCBnbG9iYWwgZmluZGl0IHNjYW4gaW4gd29ya2luZyBkaXJlY3RvcnlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGF0aC5leHRuYW1lKGZpbGUpID09PSAnLnRzJyAmJiBpbmNsdWRlUGFyc2VyLnRlc3RGaWxlKGZpbGUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygnSW5jbHVkaW5nJywgZmlsZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjYW5uZWRGaWxlcy5wdXNoKGZpbGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwYXRoLmV4dG5hbWUoZmlsZSkgPT09ICcudHMnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIud2FybignRXhjbHVkaW5nZScsIGZpbGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ0luY2x1ZGluZycsIGZpbGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjYW5uZWRGaWxlcy5wdXNoKGZpbGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICBmaW5kZXIub24oJ2VuZCcsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1cGVyLnNldEZpbGVzKHNjYW5uZWRGaWxlcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJvZ3JhbS5jb3ZlcmFnZVRlc3QgfHwgcHJvZ3JhbS5jb3ZlcmFnZVRlc3RQZXJGaWxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oJ1J1biBkb2N1bWVudGF0aW9uIGNvdmVyYWdlIHRlc3QnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdXBlci50ZXN0Q292ZXJhZ2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VwZXIuZ2VuZXJhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChDb25maWd1cmF0aW9uLm1haW5EYXRhLnRzY29uZmlnICYmIHByb2dyYW0uYXJncy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogdHNjb25maWcgZmlsZSBwcm92aWRlZCB3aXRoIHNvdXJjZSBmb2xkZXIgaW4gYXJnXG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgbGV0IHRlc3RUc0NvbmZpZ1BhdGggPSBDb25maWd1cmF0aW9uLm1haW5EYXRhLnRzY29uZmlnLmluZGV4T2YocHJvY2Vzcy5jd2QoKSk7XG4gICAgICAgICAgICAgICAgaWYgKHRlc3RUc0NvbmZpZ1BhdGggIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIENvbmZpZ3VyYXRpb24ubWFpbkRhdGEudHNjb25maWcgPSBDb25maWd1cmF0aW9uLm1haW5EYXRhLnRzY29uZmlnLnJlcGxhY2UoXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzLmN3ZCgpICsgcGF0aC5zZXAsXG4gICAgICAgICAgICAgICAgICAgICAgICAnJ1xuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGxldCBzb3VyY2VGb2xkZXIgPSBwcm9ncmFtLmFyZ3NbMF07XG4gICAgICAgICAgICAgICAgaWYgKCFGaWxlRW5naW5lLmV4aXN0c1N5bmMoc291cmNlRm9sZGVyKSkge1xuICAgICAgICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAgICAgICAgICAgICBgUHJvdmlkZWQgc291cmNlIGZvbGRlciAke3NvdXJjZUZvbGRlcn0gd2FzIG5vdCBmb3VuZCBpbiB0aGUgY3VycmVudCBkaXJlY3RvcnlgXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbygnVXNpbmcgcHJvdmlkZWQgc291cmNlIGZvbGRlcicpO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmICghRmlsZUVuZ2luZS5leGlzdHNTeW5jKENvbmZpZ3VyYXRpb24ubWFpbkRhdGEudHNjb25maWcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYFwiJHtDb25maWd1cmF0aW9uLm1haW5EYXRhLnRzY29uZmlnfVwiIGZpbGUgd2FzIG5vdCBmb3VuZCBpbiB0aGUgY3VycmVudCBkaXJlY3RvcnlgXG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IF9maWxlID0gcGF0aC5qb2luKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhdGguam9pbihwcm9jZXNzLmN3ZCgpLCBwYXRoLmRpcm5hbWUoQ29uZmlndXJhdGlvbi5tYWluRGF0YS50c2NvbmZpZykpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhdGguYmFzZW5hbWUoQ29uZmlndXJhdGlvbi5tYWluRGF0YS50c2NvbmZpZylcbiAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB1c2UgdGhlIGN1cnJlbnQgZGlyZWN0b3J5IG9mIHRzY29uZmlnLmpzb24gYXMgYSB3b3JraW5nIGRpcmVjdG9yeVxuICAgICAgICAgICAgICAgICAgICAgICAgY3dkID0gX2ZpbGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuc3BsaXQocGF0aC5zZXApXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLnNsaWNlKDAsIC0xKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5qb2luKHBhdGguc2VwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKCdVc2luZyB0c2NvbmZpZyBmaWxlICcsIF9maWxlKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRzQ29uZmlnRmlsZSA9IHJlYWRDb25maWcoX2ZpbGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRzQ29uZmlnRmlsZS5maWxlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjYW5uZWRGaWxlcyA9IHRzQ29uZmlnRmlsZS5maWxlcztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZXZlbiBpZiBmaWxlcyBhcmUgc3VwcGxpZWQgd2l0aCBcImZpbGVzXCIgYXR0cmlidXRlcywgZW5oYW5jZSB0aGUgYXJyYXkgd2l0aCBpbmNsdWRlc1xuICAgICAgICAgICAgICAgICAgICAgICAgZXhjbHVkZUZpbGVzID0gdHNDb25maWdGaWxlLmV4Y2x1ZGUgfHwgW107XG4gICAgICAgICAgICAgICAgICAgICAgICBpbmNsdWRlRmlsZXMgPSB0c0NvbmZpZ0ZpbGUuaW5jbHVkZSB8fCBbXTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNjYW5uZWRGaWxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5jbHVkZUZpbGVzID0gWy4uLmluY2x1ZGVGaWxlcywgLi4uc2Nhbm5lZEZpbGVzXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGV4Y2x1ZGVQYXJzZXIgPSBuZXcgUGFyc2VyVXRpbCgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluY2x1ZGVQYXJzZXIgPSBuZXcgUGFyc2VyVXRpbCgpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBleGNsdWRlUGFyc2VyLmluaXQoZXhjbHVkZUZpbGVzLCBjd2QpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5jbHVkZVBhcnNlci5pbml0KGluY2x1ZGVGaWxlcywgY3dkKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHN0YXJ0Q3dkID0gc291cmNlRm9sZGVyO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgZXhjbHVkZVBhcnNlclRlc3RGaWxlc1dpdGhDd2REZXB0aCA9IGV4Y2x1ZGVQYXJzZXIudGVzdEZpbGVzV2l0aEN3ZERlcHRoKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWV4Y2x1ZGVQYXJzZXJUZXN0RmlsZXNXaXRoQ3dkRGVwdGguc3RhdHVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnRDd2QgPSBleGNsdWRlUGFyc2VyLnVwZGF0ZUN3ZChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3dkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleGNsdWRlUGFyc2VyVGVzdEZpbGVzV2l0aEN3ZERlcHRoLmxldmVsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpbmNsdWRlUGFyc2VyVGVzdEZpbGVzV2l0aEN3ZERlcHRoID0gaW5jbHVkZVBhcnNlci50ZXN0RmlsZXNXaXRoQ3dkRGVwdGgoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaW5jbHVkZVBhcnNlci50ZXN0RmlsZXNXaXRoQ3dkRGVwdGgoKS5zdGF0dXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydEN3ZCA9IGluY2x1ZGVQYXJzZXIudXBkYXRlQ3dkKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjd2QsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluY2x1ZGVQYXJzZXJUZXN0RmlsZXNXaXRoQ3dkRGVwdGgubGV2ZWxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgZmluZGVyID0gcmVxdWlyZSgnZmluZGl0MicpKHBhdGgucmVzb2x2ZShzdGFydEN3ZCkpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBmaW5kZXIub24oJ2RpcmVjdG9yeScsIGZ1bmN0aW9uKGRpciwgc3RhdCwgc3RvcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBiYXNlID0gcGF0aC5iYXNlbmFtZShkaXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChiYXNlID09PSAnLmdpdCcgfHwgYmFzZSA9PT0gJ25vZGVfbW9kdWxlcycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RvcCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBmaW5kZXIub24oJ2ZpbGUnLCAoZmlsZSwgc3RhdCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgvKHNwZWN8XFwuZClcXC50cy8udGVzdChmaWxlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIud2FybignSWdub3JpbmcnLCBmaWxlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGV4Y2x1ZGVQYXJzZXIudGVzdEZpbGUoZmlsZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLndhcm4oJ0V4Y2x1ZGluZycsIGZpbGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaW5jbHVkZUZpbGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqIElmIGluY2x1ZGUgcHJvdmlkZWQgaW4gdHNjb25maWcsIHVzZSBvbmx5IHRoaXMgc291cmNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKiBhbmQgbm90IGZpbGVzIGZvdW5kIHdpdGggZ2xvYmFsIGZpbmRpdCBzY2FuIGluIHdvcmtpbmcgZGlyZWN0b3J5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGF0aC5leHRuYW1lKGZpbGUpID09PSAnLnRzJyAmJiBpbmNsdWRlUGFyc2VyLnRlc3RGaWxlKGZpbGUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIuZGVidWcoJ0luY2x1ZGluZycsIGZpbGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Nhbm5lZEZpbGVzLnB1c2goZmlsZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGF0aC5leHRuYW1lKGZpbGUpID09PSAnLnRzJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci53YXJuKCdFeGNsdWRpbmcnLCBmaWxlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci5kZWJ1ZygnSW5jbHVkaW5nJywgZmlsZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjYW5uZWRGaWxlcy5wdXNoKGZpbGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBmaW5kZXIub24oJ2VuZCcsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdXBlci5zZXRGaWxlcyhzY2FubmVkRmlsZXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcm9ncmFtLmNvdmVyYWdlVGVzdCB8fCBwcm9ncmFtLmNvdmVyYWdlVGVzdFBlckZpbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oJ1J1biBkb2N1bWVudGF0aW9uIGNvdmVyYWdlIHRlc3QnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VwZXIudGVzdENvdmVyYWdlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VwZXIuZ2VuZXJhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmVycm9yKCd0c2NvbmZpZy5qc29uIGZpbGUgd2FzIG5vdCBmb3VuZCwgcGxlYXNlIHVzZSAtcCBmbGFnJyk7XG4gICAgICAgICAgICAgICAgb3V0cHV0SGVscCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuIl0sIm5hbWVzIjpbInBhdGgucmVzb2x2ZSIsInBhdGguc2VwIiwicGF0aC5iYXNlbmFtZSIsInRzbGliXzEuX19leHRlbmRzIiwiQ09NUE9ET0NfREVGQVVMVFMiLCJjb3NtaWNvbmZpZ1N5bmMiLCJDb25maWd1cmF0aW9uIiwibG9nZ2VyIiwiZnMucmVhZEZpbGVTeW5jIiwicGF0aC5qb2luIiwidHMiLCJGaWxlRW5naW5lIiwiQW5ndWxhclZlcnNpb25VdGlsIiwiSTE4bkVuZ2luZSIsInBhdGguZGlybmFtZSIsInJlYWRDb25maWciLCJwYXRoLmV4dG5hbWUiLCJBcHBsaWNhdGlvbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVBLElBQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUU3QjtJQUFBO1FBR1ksZUFBVSxHQUFHLEVBQUUsQ0FBQztLQTJFM0I7SUF6RVUseUJBQUksR0FBWCxVQUFZLE9BQWlCLEVBQUUsR0FBVztRQUN0QyxJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQztRQUN0QixJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQztRQUNoQixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDVixJQUFJLEdBQUcsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDO1FBRXpCLEtBQUssQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDbEIsSUFBSSxDQUFDLFVBQVUsR0FBTyxJQUFJLENBQUMsVUFBVSxRQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDeEY7S0FDSjtJQUVNLDBDQUFxQixHQUE1QjtRQUNJLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNWLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO1FBQzdCLElBQUksTUFBTSxH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
