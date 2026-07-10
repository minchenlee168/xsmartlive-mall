import { createApp } from 'vue';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import Tooltip from 'primevue/tooltip';
import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import '@awesome.me/kit-979923bcd0/icons/css/all.min.css';
import router from './router';
import './style.css';
import App from './App.vue';

// 全域常用元件（避免各檔重複 import）
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Password from 'primevue/password';
import Select from 'primevue/select';
import Checkbox from 'primevue/checkbox';
import RadioButton from 'primevue/radiobutton';
import SelectButton from 'primevue/selectbutton';
import Drawer from 'primevue/drawer';
import Dialog from 'primevue/dialog';
import Carousel from 'primevue/carousel';
import Tag from 'primevue/tag';
import Badge from 'primevue/badge';
import OverlayBadge from 'primevue/overlaybadge';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import Menu from 'primevue/menu';
import DatePicker from 'primevue/datepicker';
import InputGroup from 'primevue/inputgroup';
import InputGroupAddon from 'primevue/inputgroupaddon';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import Paginator from 'primevue/paginator';
import Timeline from 'primevue/timeline';
import ProgressSpinner from 'primevue/progressspinner';
import ToggleSwitch from 'primevue/toggleswitch';

// 橋接：把 Aura 的 primary semantic token 對應到既有 CSS 變數，
// 讓執行時的 8 套主題切換器（theme.ts 寫 documentElement.style）也能
// 連 PrimeVue 元件一起重新上色。
const AppPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: 'var(--primary-50)',
      100: 'var(--primary-100)',
      200: 'var(--primary-200)',
      300: 'var(--primary-300)',
      400: 'var(--primary-400)',
      500: 'var(--primary)',
      600: 'var(--primary-hover-bg)',
      700: 'var(--primary-700)',
      800: 'var(--primary-800)',
      900: 'var(--primary-900)',
      950: 'var(--primary-950)',
    },
    colorScheme: {
      light: {
        primary: {
          color: 'var(--primary)',
          contrastColor: '#ffffff',
          hoverColor: 'var(--primary-hover-bg)',
          activeColor: 'var(--primary-hover-bg)',
        },
        highlight: {
          background: 'var(--primary-surface)',
          focusBackground: 'var(--primary-200)',
          color: 'var(--primary)',
          focusColor: 'var(--primary)',
        },
      },
    },
  },
});

const app = createApp(App);

app
  .use(createPinia())
  .use(router)
  .use(PrimeVue, {
    theme: {
      preset: AppPreset,
      options: {
        darkModeSelector: '.dark',
        // 讓 PrimeVue 樣式進到 primevue layer，Tailwind utilities 排在其後，
        // 佈局 utility（flex/gap/w-…）才能覆蓋 PrimeVue 內部樣式。
        cssLayer: { name: 'primevue', order: 'theme, base, primevue' },
      },
    },
  })
  .use(ConfirmationService);

app.component('FontAwesomeIcon', FontAwesomeIcon);
app.directive('tooltip', Tooltip);

// 全域註冊元件
app.component('Button', Button);
app.component('InputText', InputText);
app.component('InputNumber', InputNumber);
app.component('Password', Password);
app.component('Select', Select);
app.component('Checkbox', Checkbox);
app.component('RadioButton', RadioButton);
app.component('SelectButton', SelectButton);
app.component('Drawer', Drawer);
app.component('Dialog', Dialog);
app.component('Carousel', Carousel);
app.component('Tag', Tag);
app.component('Badge', Badge);
app.component('OverlayBadge', OverlayBadge);
app.component('Tabs', Tabs);
app.component('TabList', TabList);
app.component('Tab', Tab);
app.component('TabPanels', TabPanels);
app.component('TabPanel', TabPanel);
app.component('Menu', Menu);
app.component('DatePicker', DatePicker);
app.component('InputGroup', InputGroup);
app.component('InputGroupAddon', InputGroupAddon);
app.component('IconField', IconField);
app.component('InputIcon', InputIcon);
app.component('Paginator', Paginator);
app.component('Timeline', Timeline);
app.component('ProgressSpinner', ProgressSpinner);
app.component('ToggleSwitch', ToggleSwitch);

app.mount('#app');
