/// <reference path="../Core/DependencyObject.ts" />
/// <reference path="../Runtime/Nullstone.ts" />
/// CODE
/// <reference path="Matrix.ts" />
/// <reference path="../Primitives/Point.ts" />
/// <reference path="../Primitives/rect.ts" />
/// <reference path="Matrix3DProjection.ts" />

module Fayde.Media {
    export class GeneralTransform extends DependencyObject {
        Inverse: GeneralTransform;
        Transform(p: Point): Point { return p; }
        TransformBounds(r: rect): rect { return r; }
        TryTransform(inPoint: Point, outPoint: Point): boolean { return false; }
    }
    Fayde.RegisterType(GeneralTransform, {
    	Name: "GeneralTransform",
    	Namespace: "Fayde.Media",
    	XmlNamespace: Fayde.XMLNS
    });

    export class InternalTransform extends GeneralTransform {
        private _Raw: number[];
        
        constructor(raw: number[]) {
            super();
            this._Raw = raw;
        }

        get Inverse(): InternalTransform { return new InternalTransform(mat4.inverse(this._Raw, mat4.create())); }
        get Value(): Matrix3D { return Matrix3D.FromRaw(this._Raw); }

        Transform(p: Point): Point {
            var pi = vec4.createFrom(p.X, p.Y, 0.0, 1.0);
            var po = vec4.create();
            mat4.transformVec4(this._Raw, pi, po);
            if (po[3] !== 0.0) {
                var w = 1.0 / po[3];
                return new Point(po[0] * w, p[1] * w);
            }
            return new Point(NaN, NaN);
        }
        TransformBounds(r: rect): rect {
            if (r)
                return rect.transform4(rect.copyTo(r), this._Raw);
            return undefined;
        }

        CreateMatrix3DProjection(): Matrix3DProjection {
            var projection = new Matrix3DProjection();
            projection.ProjectionMatrix = this.Inverse.Value;
            return projection
        }
    }
    Fayde.RegisterType(InternalTransform, {
    	Name: "InternalTransform",
    	Namespace: "Fayde.Media",
    	XmlNamespace: Fayde.XMLNS
    });
}