/// <reference path="Primitives/ToggleButton.ts" />

module Fayde.Controls {
    export class CheckBox extends Primitives.ToggleButton {
        constructor() {
            super();
            this.DefaultStyleKey = (<any>this).constructor;
        }
    }
    Fayde.RegisterType(CheckBox, {
    	Name: "CheckBox",
    	Namespace: "Fayde.Controls",
    	XmlNamespace: Fayde.XMLNS
    });
}