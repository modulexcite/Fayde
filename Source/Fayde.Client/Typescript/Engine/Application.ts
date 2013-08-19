/// <reference path="../Core/DependencyObject.ts" />
/// CODE
/// <reference path="../Xaml/XamlLoader.ts" />
/// <reference path="../Runtime/TimelineProfile.ts" />
/// <reference path="Surface.ts" />
/// <reference path="../Core/ResourceDictionary.ts" />
/// <reference path="../Primitives/Uri.ts" />
/// <reference path="ClockTimer.ts" />
/// <reference path="../Navigation/NavService.ts" />
/// <reference path="DebugInterop.ts" />

interface ITimeline {
    Update(nowTime: number);
}

module Fayde {
    export class Application extends DependencyObject implements IResourcable, ITimerListener {
        static Version: string = "0.9.6.0";
        static Current: Application;
        MainSurface: Surface;
        Loaded: MulticastEvent<EventArgs> = new MulticastEvent<EventArgs>();
        Address: Uri = null;
        NavService: Navigation.NavService;
        DebugInterop: DebugInterop;
        Theme: string = "Metro";
        static Themes: Xaml.Theme[] = [];
        private _IsRunning: boolean = false;
        private _Storyboards: ITimeline[] = [];
        private _ClockTimer: ClockTimer = new ClockTimer();

        static ResourcesProperty = DependencyProperty.RegisterImmutable("Resources", () => ResourceDictionary, Application);
        Resources: ResourceDictionary;

        constructor() {
            super();
            this.XamlNode.NameScope = new NameScope(true);
            var rd = Application.ResourcesProperty.Initialize<ResourceDictionary>(this);
            this.MainSurface = new Surface(this);
            this.DebugInterop = new DebugInterop(this);
            this.Address = new Uri(document.URL);
            this.NavService = new Navigation.NavService(this);
        }

        get RootVisual(): UIElement { return this.MainSurface._RootLayer; }

        Start() {
            this._ClockTimer.RegisterTimer(this);
            this.Loaded.RaiseAsync(this, EventArgs.Empty);
        }

        OnTicked(lastTime: number, nowTime: number) {
            this.DebugInterop.NumFrames++;
            this.ProcessStoryboards(lastTime, nowTime);
            this.Update();
            this.Render();
        }
        private StopEngine() {
            this._ClockTimer.UnregisterTimer(this);
        }

        private ProcessStoryboards(lastTime: number, nowTime: number) {
            var sbs = this._Storyboards;
            var len = sbs.length;
            for (var i = 0; i < len; i++) {
                sbs[i].Update(nowTime);
            }
        }
        private Update() {
            if (this._IsRunning)
                return;

            //var startLayoutTime;
            //var isLayoutPassTimed;
            //if (isLayoutPassTimed = (this._DebugFunc[3] != null))
            //startLayoutTime = new Date().getTime();

            this._IsRunning = true;
            //try {
            var updated = this.MainSurface.ProcessDirtyElements();
            //} catch (err) {
            //Fatal("An error occurred processing dirty elements: " + err.toString());
            //}
            this._IsRunning = false;

            //if (updated && isLayoutPassTimed)
            //this._NotifyDebugLayoutPass(new Date().getTime() - startLayoutTime);
        }
        private Render() {
            this.MainSurface.Render();
        }

        RegisterStoryboard(storyboard: ITimeline) {
            var sbs = this._Storyboards;
            var index = sbs.indexOf(storyboard);
            if (index === -1)
                sbs.push(storyboard);
        }
        UnregisterStoryboard(storyboard: ITimeline) {
            var sbs = this._Storyboards;
            var index = sbs.indexOf(storyboard);
            if (index !== -1)
                sbs.splice(index, 1);
        }

        get CurrentTheme(): Xaml.Theme {
            var themeName = this.Theme;
            var theme = Application.Themes.filter(t => t.Name == themeName)[0];
            if (!theme) {
                console.warn("Could not find theme: " + themeName);
                theme = Application.Themes[0];
            }
            return theme;
        }
        GetImplicitStyle(type: any): Style {
            var theme = this.CurrentTheme;
            if (!theme)
                return;
            var rd = theme.ResourceDictionary;
            if (!rd)
                return;
            return <Style><any>rd.Get(type);
        }

        private __DebugLayers(): string {
            return this.MainSurface.__DebugLayers();
        }
        private __GetById(id: number): UIElement {
            return this.MainSurface.__GetById(id);
        }
    }
    Fayde.RegisterType(Application, {
    	Name: "Application",
    	Namespace: "Fayde",
    	XmlNamespace: Fayde.XMLNS
    });

    export function Run() { }
    export function Start(xaml: string, canvas: HTMLCanvasElement) {
        TimelineProfile.TimelineStart = new Date().valueOf();
        TimelineProfile.Parse(true, "App");
        Xaml.LoadApplication(xaml, canvas, (app: Application) => {
            TimelineProfile.Parse(false, "App");
            Application.Current = app;
            Application.Current.Start();
        });
    }
}