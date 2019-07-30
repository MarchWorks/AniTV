const {
  Menu: { buildFromTemplate },
  shell
} = require('electron');

module.exports = async () => {
  // We have to explicitly add a "Main" item on linux, otherwise
  // there would be no way to toggle the main mainWindow
  const prependItems =
    process.platform === 'linux'
      ? [
          {
            label: 'Main',
            click() {
              console.log('test');
            }
          }
        ]
      : [];

  return buildFromTemplate(
    prependItems.concat([
      {
        label: 'Open issue',
        click() {
          shell.openExternal('https://github.com/MarchWorks/AniTV/issues/new');
        }
      },
      {
        type: 'separator'
      },
      {
        role: 'quit',
        accelerator: 'Cmd+Q'
      }
    ])
  );
};
