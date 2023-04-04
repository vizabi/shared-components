# vizabi shared components

Contains handy but not necessary things for making data visualisations in vizabi framework
Hosts the shared functionality as described below:


## Components

Components are classes, which are instansiated in a tree structure

## Helpers

Helpers are context dependant classes, that are kind of like components, but i can't formulate the difference really 

## Utils

Utils are handy functions that do not retain their own state
Utils are shared between all components, services and helpers

## Services

Services are singleton instances, that are available through the entire component tree

Init services in your root component (tool) constructor like so:

```
config.services = {
  locale: new LocaleService(),
  layout: new LayoutService(config)
};

//register locale service in the marker model
config.model.config.data.locale = config.services.locale;
```

Then, from any component you can have access to `this.services.locale` or `this.services.layout`.

### Locale service
Loads the locale settings (see section "assets") asynchronously during setup, sets status to ready when done

const locale = this.services.locale;

locale.content //access locale settings directly
locale.id //observable id of the current locale 
locale.isRTL //returns rtl setting from content

//formatters
locale.getFormattedNumber(456454644) //"456M"
locale.getFormattedDate(new Date()) //"2019"
locale.getUIstring("buttons/apply") //"Apply"
  
//convenience method
locale.auto(this.MDL.frame.interval);


### Layout service


## Assets

### Locale settings, Currency signs, rtl languages, Translation strings
Live in assets/locale
Accessible via locale service (see section "locale service")

### Icons
Live in assets/icons/iconset.js

```
import { ICON_CLOSE as iconClose } from "../../icons/iconset";
divSelection
  .html(iconClose)
```  

```
import { Icons } from "@vizabi/shared-components";
const {ICON_LOCK, ICON_UNLOCK} = Icons;
divSelection
  .html(iconset[locked ? "ICON_LOCK" : "ICON_UNLOCK"]);
```
