import { RouterProvider } from 'react-router-dom';
// import { ApolloProvider } from '@apollo/client';

// routing
import router from 'routes';

// project imports
import Locales from 'ui-component/Locales';
import NavigationScroll from 'layout/NavigationScroll';
// import RTLLayout from 'ui-component/RTLLayout';
import Snackbar from 'ui-component/extended/Snackbar';
import Notistack from 'ui-component/third-party/Notistack';

// Apollo client
// import apolloClients from './api/apollo-client';

import ThemeCustomization from 'themes';

// ==============================|| APP ||============================== //

export default function App() {
  return (
    <ThemeCustomization>
      {/* <RTLLayout> */}
      <Locales>
        <NavigationScroll>
          <Notistack>
            <RouterProvider router={router} />
            <Snackbar />
          </Notistack>
        </NavigationScroll>
      </Locales>
      {/* </RTLLayout> */}
    </ThemeCustomization>
  );
}
