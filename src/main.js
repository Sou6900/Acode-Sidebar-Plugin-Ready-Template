import plugin from '../plugin.json';
import styleText from './style.css'; 
import icon from './assets/icon.png';

const sideBarApps = acode.require('sidebarApps');
const APP_ID = 'your_custom_sidebar_name';
const STYLE_ID = 'my_sidebar_plugin_style';
let baseUrl = '';

function initPlugin() {
  sideBarApps.add(
    'plugin-one-custom-svg-icon', 
    APP_ID,
    'My App',
    (container) => {
      container.innerHTML = `
        <div class="my-sidebar-container">
            <h2>Welcome to sidebar</h2>
        </div>
      `;
    },
    false
  );
}

function destroyPlugin() {
  sideBarApps.remove(APP_ID);
  const $style = document.getElementById(STYLE_ID);
  if ($style) $style.remove();
}

if (window.acode) {
  acode.setPluginInit(plugin.id, async (_baseUrl, $page, { cacheFileUrl, cacheFile }) => {
    baseUrl = _baseUrl;
    
    const $style = document.createElement('style');
    $style.id = STYLE_ID;
    $style.innerHTML = styleText; 
    document.head.appendChild($style);

    acode.addIcon('plugin-one-custom-svg-icon', icon);
    await initPlugin();
  });

  acode.setPluginUnmount(plugin.id, () => destroyPlugin());
}