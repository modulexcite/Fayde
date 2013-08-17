/// <reference path="Expression.ts" />
/// CODE
/// <reference path="TypeConverter.ts" />
/// <reference path="../Controls/ContentControl.ts" />
/// <reference path="Providers/PropertyStore.ts" />

module Fayde {
    export class TemplateBindingExpression extends Expression {
        private _Target: DependencyObject;
        private _Listener: Providers.IPropertyChangedListener;
        SourceProperty: DependencyProperty;
        TargetProperty: DependencyProperty;
        TargetPropertyName: string;
        private _SetsParent: boolean = false;
        constructor(sourcePropd: DependencyProperty, targetPropd: DependencyProperty, targetPropName: string) {
            super();
            this.SourceProperty = sourcePropd;
            this.TargetProperty = targetPropd;
            this.TargetPropertyName = targetPropName;
        }

        GetValue(propd: DependencyProperty) {
            var target = this._Target;
            var source = target.TemplateOwner;
            var value;
            if (source)
                value = source.GetValue(this.SourceProperty);
            value = TypeConverter.ConvertObject(this.TargetProperty, value, (<any>target).constructor, true);
            return value;
        }
        OnAttached(dobj: DependencyObject) {
            super.OnAttached(dobj);

            this._Target = dobj;
            this._DetachListener();

            var cc: Controls.ContentControl;
            if (this._Target instanceof Controls.ContentControl)
                cc = <Controls.ContentControl>this._Target;

            if (cc && this.TargetProperty._ID === Controls.ContentControl.ContentProperty._ID) {
                this._SetsParent = cc._ContentSetsParent;
                cc._ContentSetsParent = false;
            }

            this._AttachListener();
        }
        OnDetached(dobj: DependencyObject) {
            super.OnDetached(dobj);

            var listener = this._Listener;
            if (!listener)
                return;

            var cc: Controls.ContentControl;
            if (this._Target instanceof Controls.ContentControl)
                cc = <Controls.ContentControl>this._Target;
            if (cc)
                cc._ContentSetsParent = this._SetsParent;

            this._DetachListener();
            this._Target = null;
        }
        OnSourcePropertyChanged(sender: DependencyObject, args: IDependencyPropertyChangedEventArgs) {
            if (this.SourceProperty._ID !== args.Property._ID)
                return;
            try {
                // Type converting doesn't happen for TemplateBindings
                this.IsUpdating = true;
                var targetProp = this.TargetProperty;
                try {
                    this._Target.SetStoreValue(targetProp, this.GetValue(null));
                } catch (err2) {
                    var val = targetProp.DefaultValue;
                    this._Target.SetStoreValue(targetProp, val);
                }
            } catch (err) {

            } finally {
                this.IsUpdating = false;
            }
        }
        private _AttachListener() {
            var source = this._Target.TemplateOwner;
            if (!source)
                return;
            this._Listener = this.SourceProperty.Store.ListenToChanged(source, this.SourceProperty, (sender, args) => this.OnSourcePropertyChanged(sender, args), this);
        }
        private _DetachListener() {
            var listener = this._Listener;
            if (listener) {
                this._Listener.Detach();
                this._Listener = null;
            }
        }
    }
    Fayde.RegisterType(TemplateBindingExpression, {
    	Name: "TemplateBindingExpression",
    	Namespace: "Fayde",
    	XmlNamespace: Fayde.XMLNS
    });
}