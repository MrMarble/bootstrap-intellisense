import vscode, { Position, Range } from 'vscode';
import { getBsClasses, getBsVersion, setBsVersion, clearCache, setStatusBarItem } from './bootstrap';

const languageSupport = [
  'html',
  'php',
  'handlebars',
  'javascript',
  'javascriptreact',
  'typescript',
  'typescriptreact',
  'vue',
  'vue-html',
  'svelte',
  'astro',
  'twig',
  'erb',
  'django-html',
  'blade',
  'razor',
  'ejs',
  'markdown',
  'css',
  'scss',
  'sass',
  'less',
  'stylus',
  'jade',
  'pug',
  'haml',
  'slim',
  'liquid',
  'edge',
  'jinja',
  'j2',
  'asp',
];

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('bootstrap-intellisense.enable', () => {
      vscode.window.showInformationMessage('Activated Bootstrap IntelliSense');
    }),
  );

  const classRegex =/class(?:Name)?=["']([ -\w]*)(?!["'])$/
  const disposable = vscode.languages.registerCompletionItemProvider(
    languageSupport,
    {
      async provideCompletionItems(document, position) {
        const lineUntilPos = document.getText(new Range(new Position(position.line, 0), position));
        const matches = lineUntilPos.match(classRegex);
        if (!matches) {
          return null;
        }
        
        const classes = await getBsClasses();
        const completionItems = [];

        matches[1].split(' ').forEach((className) => {
          const index = classes.indexOf(className);
          if (index !== -1) {
            classes.splice(index, 1);
          }
        })

        for (const className of classes) {
          const completionItem = new vscode.CompletionItem(className);

          completionItem.kind = vscode.CompletionItemKind.Value;
          completionItem.detail = 'Bootstrap IntelliSense';

          completionItems.push(completionItem);
        }
        return completionItems;
      },
    },
    ' ',
    '"',
    "'",
  );
  context.subscriptions.push(disposable);

  setStatusBarItem(getBsVersion());

  context.subscriptions.push(
    vscode.commands.registerCommand('bootstrap-intellisense.changeVersion', () => {
      selectBootstrapVersion();
    }),
  );
}

export function deactivate() {
  clearCache();
}

function selectBootstrapVersion() {
  const versionList5 = ['Bootstrap v5.3', 'Bootstrap v5.2', 'Bootstrap v5.1', 'Bootstrap v5.0'];
  const versionList4 = [
    'Bootstrap v4.6',
    'Bootstrap v4.5',
    'Bootstrap v4.4',
    'Bootstrap v4.3',
    'Bootstrap v4.2',
    'Bootstrap v4.1',
    'Bootstrap v4.0',
  ];

  const versionList = [...versionList5, ...versionList4];

  const currentVersion = getBsVersion();

  const version = vscode.window.createQuickPick();

  version.items = versionList.map((version) => {
    return {
      label: version,
      description: version === currentVersion ? 'Version Selected' : '',
    };
  });

  version.onDidChangeSelection((selection) => {
    if (selection[0]) {
      setStatusBarItem(selection[0].label);
      setBsVersion(selection[0].label);
      vscode.window.showInformationMessage(`Selected Bootstrap version: ${selection[0].label}`);

      version.dispose();
    }
  });
  version.show();
}
