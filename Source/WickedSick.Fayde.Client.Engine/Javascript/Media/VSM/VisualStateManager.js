/// <reference path="../../Runtime/RefObject.js" />
/// <reference path="../../Core/DependencyObject.js"/>
/// <reference path="VisualStateGroup.js"/>
/// CODE
/// <reference path="UserControl.js"/>
/// <reference path="VisualTreeHelper.js"/>
/// <reference path="Control.js"/>
/// <reference path="VisualState.js"/>
/// <reference path="VisualStateGroup.js"/>
/// <reference path="VisualTransition.js"/>

//#region VisualStateManager

function VisualStateManager() {
    DependencyObject.call(this);
}
VisualStateManager.InheritFrom(DependencyObject);

//#region DEPENDENCY PROPERTIES

VisualStateManager.VisualStateGroupsProperty = DependencyProperty.RegisterAttached("VisualStateGroups", function () { return VisualStateGroupCollection; }, VisualStateManager, null);
VisualStateManager.GetVisualStateGroups = function (d) {
    /// <param name="d" type="DependencyObject"></param>
    /// <returns type="VisualStateGroupCollection" />
    return d.GetValue(VisualStateManager.VisualStateGroupsProperty);
};
VisualStateManager.SetVisualStateGroups = function (d, value) {
    /// <param name="d" type="DependencyObject"></param>
    /// <param name="value" type="VisualStateGroupCollection"></param>
    d.SetValue(VisualStateManager.VisualStateGroupsProperty, value);
};
VisualStateManager._GetVisualStateGroupsInternal = function (d) {
    /// <param name="d" type="DependencyObject"></param>
    var groups = this.GetVisualStateGroups(d);
    if (groups == null) {
        groups = new VisualStateGroupCollection();
        VisualStateManager.SetVisualStateGroups(d, groups);
    }
    return groups;
};

VisualStateManager.CustomVisualStateManagerProperty = DependencyProperty.RegisterAttached("CustomVisualStateManager", function () { return VisualStateManager }, VisualStateManager, null);
VisualStateManager.GetCustomVisualStateManager = function (d) {
    ///<returns type="VisualStateManager"></returns>
    return d.GetValue(VisualStateManager.CustomVisualStateManagerProperty);
};
VisualStateManager.SetCustomVisualStateManager = function (d, value) {
    ///<param name="value" type="VisualStateManager"></param>
    d.SetValue(VisualStateManager.CustomVisualStateManagerProperty, value);
};

//#endregion

VisualStateManager.prototype.GoToStateCore = function (control, element, stateName, group, state, useTransitions) {
    /// <param name="control" type="Control"></param>
    /// <param name="element" type="FrameworkElement"></param>
    /// <param name="stateName" type="String"></param>
    /// <param name="group" type="VisualStateGroup"></param>
    /// <param name="state" type="VisualState"></param>
    /// <param name="useTransitions" type="Boolean"></param>
    /// <returns type="Boolean" />
    return VisualStateManager.GoToStateInternal(control, element, group, state, useTransitions);
};

VisualStateManager.GoToState = function (control, stateName, useTransitions) {
    /// <param name="control" type="Control"></param>
    /// <param name="stateName" type="String"></param>
    /// <param name="useTransitions" type="Boolean"></param>
    /// <returns type="Boolean" />

    var root = VisualStateManager._GetTemplateRoot(control);
    if (root == null)
        return false;

    var groups = VisualStateManager._GetVisualStateGroupsInternal(root);
    if (groups == null)
        return false;

    var data = {};
    if (!VisualStateManager._TryGetState(groups, stateName, data))
        return false;

    var customVsm = VisualStateManager.GetCustomVisualStateManager(root);
    if (customVsm != null) {
        return customVsm.GoToStateCore(control, root, stateName, data.group, data.state, useTransitions);
    } else if (data.state != null) {
        return VisualStateManager.GoToStateInternal(control, root, data.group, data.state, useTransitions);
    }

    return false;
};
VisualStateManager.GoToStateInternal = function (control, element, group, state, useTransitions) {
    /// <param name="control" type="Control"></param>
    /// <param name="element" type="FrameworkElement"></param>
    /// <param name="group" type="VisualStateGroup"></param>
    /// <param name="state" type="VisualState"></param>
    /// <param name="useTransitions" type="Boolean"></param>
    /// <returns type="Boolean" />

    var lastState = group.GetCurrentState();
    if (RefObject.RefEquals(lastState, state))
        return true;

    var transition = useTransitions ? VisualStateManager._GetTransition(element, group, lastState, state) : null;

    var dynamicTransition = VisualStateManager._GenerateDynamicTransitionAnimations(element, group, state, transition);
    dynamicTransition.SetValue(Control.IsTemplateItemProperty, true);

    if (transition == null || (transition.GetGeneratedDuration().IsZero() && (transition.GetStoryboard() == null || transition.GetStoryboard().GetDuration().IsZero()))) {
        if (transition != null && transition.GetStoryboard() != null) {
            group.StartNewThenStopOld(element, [transition.GetStoryboard(), state.GetStoryboard()]);
        } else {
            group.StartNewThenStopOld(element, [state.GetStoryboard()]);
        }
        group.RaiseCurrentStateChanging(element, lastState, state, control);
        group.RaiseCurrentStateChanged(element, lastState, state, control);
    } else {
        var eventClosure = new RefObject();
        transition.SetDynamicStoryboardCompleted(false);
        var dynamicCompleted = function (sender, e) {
            if (transition.GetStoryboard() == null || transition.GetExplicitStoryboardCompleted() === true) {
                group.StartNewThenStopOld(element, [state.GetStoryboard()]);
                group.RaiseCurrentStateChanged(element, lastState, state, control);
            }
            transition.SetDynamicStoryboardCompleted(true);
        };
        dynamicTransition.Completed.Subscribe(dynamicCompleted, eventClosure);

        if (transition.GetStoryboard() != null && transition.GetExplicitStoryboardCompleted() === true) {
            var transitionCompleted = function (sender, e) {
                if (transition.GetDynamicStoryboardCompleted() === true) {
                    group.StartNewThenStopOld(element, [state.GetStoryboard()]);
                    group.RaiseCurrentStateChanged(element, lastState, state, control);
                }
                transition.GetStoryboard().Completed.Unsubscribe(transitionCompleted, eventClosure);
                transition.SetExplicitStoryboardCompleted(true);
            };
            transition.SetExplicitStoryboardCompleted(false);
            transition.GetStoryboard().Completed.Subscribe(transitionCompleted, eventClosure);
        }
        group.StartNewThenStopOld(element, [transition.GetStoryboard(), dynamicTransition]);
        group.RaiseCurrentStateChanging(element, lastState, state, control);
    }

    group.SetCurrentState(state);
    return true;
};

VisualStateManager._GetTemplateRoot = function (control) {
    /// <param name="control" type="Control"></param>
    /// <returns type="FrameworkElement" />
    var userControl = RefObject.As(control, UserControl);
    if (userControl != null)
        return RefObject.As(userControl.GetContent(), FrameworkElement);
    if (VisualTreeHelper.GetChildrenCount(control) > 0)
        return RefObject.As(VisualTreeHelper.GetChild(control, 0), FrameworkElement);
    return null;
};
VisualStateManager._TryGetState = function (groups, stateName, data) {
    /// <param name="groups" type="VisualStateGroupCollection"></param>
    /// <param name="stateName" type="String"></param>
    /// <returns type="Boolean" />
    for (var i = 0; i < groups.GetCount(); i++) {
        data.group = groups.GetValueAt(i);
        data.state = data.group.GetState(stateName);
        if (data.state != null)
            return true;
    }
    data.group = null;
    data.state = null;
    return false;
};

VisualStateManager._GetTransition = function (element, group, from, to) {
    /// <param name="element" type="FrameworkElement"></param>
    /// <param name="group" type="VisualStateGroup"></param>
    /// <param name="from" type="VisualState"></param>
    /// <param name="to" type="VisualState"></param>
    /// <returns type="VisualTransition" />
    NotImplemented("VisualStateManager._GetTransition");
    return null;
};
VisualStateManager._GenerateDynamicTransitionAnimations = function (root, group, state, transition) {
    /// <param name="root" type="FrameworkElement"></param>
    /// <param name="group" type="VisualStateGroup"></param>
    /// <param name="state" type="VisualState"></param>
    /// <param name="transition" type="VisualTransition"></param>
    /// <returns type="Storyboard" />
    NotImplemented("VisualStateManager._GenerateDynamicTransitionAnimations");
    return new Storyboard();
};

//#endregion