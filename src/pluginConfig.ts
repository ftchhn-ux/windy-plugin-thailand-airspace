import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
    // 1. Matches your npm package name
    name: 'windy-plugin-thailand-airspace', 
    
    // 2. IMPORTANT: Keep this identical to the version in your package.json
    version: '1.3.0', 
    
    // 3. This looks great in the Windy sidebar
    icon: '✈️', 
    
    // 4. The user-facing label
    title: 'Thailand Airspace', 
    description: 'Interactive Airspace mapping, control zones, and GPX route planning for Thailand.',
    
    // 5. Your developer handle
    author: 'FRAGEN', 
    
    // 6. Updated to your renamed repository link
    repository: 'https://github.com/ftchhn-ux/windy-plugin-thailand-airspace', 
    
    desktopUI: 'rhpane',
    mobileUI: 'fullscreen',
    
    // 7. The URL path in the browser (e.g., windy.com/plugins/thailand-airspace)
    routerPath: '/thailand-airspace', 
    
    // 8. MUST be false for the public to see it
    private: false, 
};

export default config;