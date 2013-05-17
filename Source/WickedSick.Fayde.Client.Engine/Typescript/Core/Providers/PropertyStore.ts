/// CODE
/// <reference path="../DependencyObject.ts" />
/// <reference path="../../Media/Animation/AnimationStorage.ts" />

module Fayde {
    export var UnsetValue = {};
}

module Fayde.Providers {
    export enum PropertyPrecedence {
        IsEnabled = 0,
        LocalValue = 1,
        LocalStyle = 2,
        ImplicitStyle = 3,
        Inherited = 4,
        InheritedDataContext = 5,
        DefaultValue = 6,

        Lowest = 6,
        Highest = 0,
        Count = 7,
    }
    
    export interface IPropertyChangedListener {
        Property: DependencyProperty;
        OnPropertyChanged(sender: DependencyObject, args: IDependencyPropertyChangedEventArgs);
        Detach();
    }

    export interface IPropertyStorage {
        OwnerNode: DONode;
        Property: DependencyProperty;
        Precedence: PropertyPrecedence;
        Animation: Media.Animation.AnimationStorage[];
        Local: any;
        LocalStyleValue: any;
        ImplicitStyleValue: any;
        PropListeners: IPropertyChangedListener[];
    }

    export interface IPropertyStorageOwner {
        _PropertyStorage: IPropertyStorage[];
    }

    export function GetStorage(dobj: DependencyObject, propd: DependencyProperty): IPropertyStorage {
        var arr = (<IPropertyStorageOwner>dobj)._PropertyStorage;
        var storage = arr[propd._ID];
        if (!storage) arr[propd._ID] = storage = propd.Store.CreateStorage(dobj, propd);
        return storage;
    }

    export class PropertyStore {
        static Instance: PropertyStore;
        GetValue(storage: IPropertyStorage): any {
            var val: any;
            if ((val = storage.Local) !== undefined)
                return val;
            if ((val = storage.LocalStyleValue) !== undefined)
                return val;
            if ((val = storage.ImplicitStyleValue) !== undefined)
                return val;
            return storage.Property.DefaultValue;
        }
        GetValuePrecedence(storage: IPropertyStorage): PropertyPrecedence {
            if (storage.Local !== undefined)
                return PropertyPrecedence.LocalValue;
            if (storage.LocalStyleValue !== undefined)
                return PropertyPrecedence.LocalStyle;
            if (storage.ImplicitStyleValue !== undefined)
                return PropertyPrecedence.ImplicitStyle;
            return PropertyPrecedence.DefaultValue;
        }

        SetLocalValue(storage: Providers.IPropertyStorage, newValue: any) {
            if (newValue === undefined || newValue === UnsetValue) {
                this.ClearValue(storage);
                return;
            }

            var propd = storage.Property;
            if (newValue && propd.GetTargetType() === String) {
                if (typeof newValue !== "string")
                    newValue = newValue.toString();
                //TODO: More type checks
            }

            var isValidOut = { IsValid: false };
            newValue = propd.ValidateSetValue(storage.OwnerNode.XObject, newValue, isValidOut);
            if (!isValidOut.IsValid)
                return;

            var oldValue = storage.Local;
            storage.Local = newValue;
            if (!propd.AlwaysChange && oldValue === newValue)
                return;
            this.OnPropertyChanged(storage, PropertyPrecedence.LocalValue, oldValue, newValue);
        }
        SetLocalStyleValue(storage: IPropertyStorage, newValue: any) {
            var oldValue = storage.LocalStyleValue;
            storage.LocalStyleValue = newValue;
            if (oldValue === newValue || storage.Precedence < PropertyPrecedence.LocalStyle)
                return;
            this.OnPropertyChanged(storage, PropertyPrecedence.LocalStyle, oldValue, newValue);
        }
        SetImplicitStyle(storage: IPropertyStorage, newValue: any) {
            var oldValue = storage.ImplicitStyleValue;
            storage.ImplicitStyleValue = newValue;
            if (oldValue === newValue || storage.Precedence < PropertyPrecedence.ImplicitStyle)
                return;
            this.OnPropertyChanged(storage, PropertyPrecedence.ImplicitStyle, oldValue, newValue);
        }

        ClearValue(storage: Providers.IPropertyStorage, notifyListeners?: bool) {
            notifyListeners = notifyListeners !== false;

            var oldLocal = storage.Local;
            if (oldLocal === undefined)
                return;

            storage.Local = undefined;
            this.OnPropertyChanged(storage, PropertyPrecedence.LocalValue, oldLocal, undefined);
        }

        OnPropertyChanged(storage: IPropertyStorage, effectivePrecedence: PropertyPrecedence, oldValue: any, newValue: any) {
            if (newValue === undefined) {
                effectivePrecedence = this.GetValuePrecedence(storage);
                newValue = this.GetValue(storage);
            }

            if (!storage.Property.IsCustom) {
                if (oldValue instanceof XamlObject)
                    (<XamlObject>oldValue).XamlNode.Detach();
                if (newValue instanceof XamlObject) {
                    var error = new BError();
                    if (!(<XamlObject>newValue).XamlNode.AttachTo(storage.OwnerNode, error))
                        error.ThrowException();
                }
            }

            storage.Precedence = effectivePrecedence;
            var propd = storage.Property;
            var args = {
                Property: propd,
                OldValue: oldValue,
                NewValue: newValue
            };
            var sender = storage.OwnerNode.XObject;
            if (propd.ChangedCallback)
                propd.ChangedCallback(sender, args);
            var listeners = storage.PropListeners;
            if (listeners) {
                var len = listeners.length;
                for (var i = 0; i < len; i++) {
                    listeners[i].OnPropertyChanged(sender, args);
                }
            }
        }
        ListenToChanged(target: DependencyObject, propd: DependencyProperty, func: (sender, args: IDependencyPropertyChangedEventArgs) => void , closure: any): Providers.IPropertyChangedListener {
            var storage = GetStorage(target, propd);
            var listeners = storage.PropListeners;
            if (!listeners) listeners = storage.PropListeners = [];

            var listener = {
                Detach: function () {
                    var index = listeners.indexOf(listener);
                    if (index > -1)
                        listeners.splice(index, 1);
                },
                Property: propd,
                OnPropertyChanged: function (sender: DependencyObject, args: IDependencyPropertyChangedEventArgs) { func.call(closure, sender, args); }
            };
            listeners.push(listener);
            return listener;
        }

        CreateStorage(dobj: DependencyObject, propd: DependencyProperty): IPropertyStorage {
            return {
                OwnerNode: dobj.XamlNode,
                Property: propd,
                Precedence: PropertyPrecedence.DefaultValue,
                Animation: undefined,
                Local: undefined,
                LocalStyleValue: undefined,
                ImplicitStyleValue: undefined,
                PropListeners: undefined,
            };
        }
        Clone(dobj: DependencyObject, sourceStorage: IPropertyStorage): IPropertyStorage {
            var newStorage = this.CreateStorage(dobj, sourceStorage.Property);
            newStorage.Precedence = sourceStorage.Precedence;
            //newStorage.ImplicitStyleValue = undefined;
            //newStorage.LocalStyleValue = undefined;
            newStorage.Local = Fayde.Clone(sourceStorage.Local);

            var srcRepo = sourceStorage.Animation;
            if (!srcRepo)
                return newStorage;
            var thisRepo = newStorage.Animation;
            for (var key in srcRepo) {
                thisRepo[key] = srcRepo[key].slice(0);
                //TODO: Clone each AnimationStorage also?
            }

            return newStorage;
        }
    }
    PropertyStore.Instance = new PropertyStore();
}