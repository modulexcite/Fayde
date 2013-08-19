/// CODE
/// <reference path="../Runtime/Nullstone.ts" />
/// <reference path="../Runtime/AjaxRequest.ts" />

module Fayde {
    export class XamlResolver {
        private _IsXamlLoaded: boolean = false;
        private _IsScriptLoaded: boolean = false;
        private _BaseHref: string = null;
        private _ScriptResult: HTMLScriptElement = null;
        private _XamlResult: IAjaxResult = null;

        constructor(public OnSuccess: (xamlResult: IAjaxResult, scriptResult: HTMLScriptElement) => void , public OnSubSuccess, public OnError: (error: string) => void ) {
        }

        Load(href: string, hash: string) {
            this._BaseHref = href;
            var xamlRequest = new AjaxRequest((result) => this._HandleXamlSuccess(result), (error) => this._HandleXamlFailed(error));
            xamlRequest.Get(href, "p=" + hash);
            Nullstone.ImportJsFile(href + "?js=true&p=" + hash, (script) => this._HandleScriptSuccess(script));
        }
        LoadGeneric(href: string, hash: string) {
            this._BaseHref = href;
            var xamlRequest = new AjaxRequest((result) => this._HandleXamlSuccess(result), (error) => this._HandleXamlFailed(error));
            xamlRequest.Get(href, hash);
            Nullstone.ImportJsFile(href + "?js=true&" + hash, (script) => this._HandleScriptSuccess(script));
        }

        private _HandleScriptSuccess(token: IJsFileImportToken) {
            this._IsScriptLoaded = true;
            this._ScriptResult = token.Script;
            this._CheckIfLoaded();
        }
        private _HandleXamlSuccess(result: IAjaxResult) {
            this._IsXamlLoaded = true;
            this._XamlResult = result;
            this._CheckIfLoaded();
        }
        private _HandleXamlFailed(error: string) {
            this.OnError(error);
        }
        private _CheckIfLoaded() {
            if (!this._IsXamlLoaded || !this._IsScriptLoaded)
                return;
            this.ResolveDependencies(
                () => this.OnSuccess(this._XamlResult, this._ScriptResult),
                (error) => this.OnError(error));
        }
        ResolveDependencies(onResolve: () => void , onFail: (error: string) => void ) {
            var dependencies = this._XamlResult.GetHeader("Dependencies");
            if (!dependencies) {
                onResolve();
                return;
            }

            var resolvers = dependencies.split("|");
            var len = resolvers.length;
            if (len < 1) {
                onResolve();
                return;
            }

            var completes = [];
            for (var i = 0; i < len; i++) {
                completes[i] = false;
            }
            function isFullyResolved(completedIndex) {
                completes[completedIndex] = true;
                for (var j = 0; j < len; j++) {
                    if (!completes[j])
                        return false;
                }
                return true;
            }
            for (var i = 0; i < len; i++) {
                resolve(this._BaseHref, resolvers[i], i, isFullyResolved, onResolve, this.OnSubSuccess, onFail);
            }
        }
    }

    function resolve(href: string, hash: string, index: number, isFullyResolved: (index: number) => boolean, onSuccess: () => void , onSubSuccess: (xamlResult: IAjaxResult, scriptResult: HTMLScriptElement) => void , onFail: (error: string) => void ) {
        var os = (function () {
            return function (xamlResult: IAjaxResult, scriptResult: HTMLScriptElement) {
                if (onSubSuccess) onSubSuccess(xamlResult, scriptResult);
                if (isFullyResolved(index))
                    onSuccess();
            };
        })();
        var resolver = new XamlResolver(os, onSubSuccess, onFail);
        resolver.LoadGeneric(href, hash);
    }
}