/// <reference path="Primitives/RangeBase.ts" />
/// CODE
/// <reference path="Primitives/RepeatButton.ts" />
/// <reference path="Primitives/Thumb.ts" />

module Fayde.Controls {
    export class Slider extends Primitives.RangeBase {
        private _DragValue: number = 0;

        static IsDirectionReversedProperty: DependencyProperty = DependencyProperty.RegisterCore("IsDirectionReversed", () => Boolean, Slider, false, (d, args) => (<Slider>d)._UpdateTrackLayout());
        static IsFocusedProperty: DependencyProperty = DependencyProperty.RegisterReadOnlyCore("IsFocused", () => Boolean, Slider, false, (d, args) => (<Slider>d).UpdateVisualState());
        static OrientationProperty: DependencyProperty = DependencyProperty.RegisterCore("Orientation", () => new Enum(Orientation), Slider, Orientation.Horizontal, (d, args) => (<Slider>d)._OnOrientationChanged());
        IsDirectionReversed: boolean;
        IsFocused: boolean;
        Orientation: Orientation;

        constructor() {
            super();
            this.DefaultStyleKey = (<any>this).constructor;
            this.SizeChanged.Subscribe(this._HandleSizeChanged, this);
        }

        private $HorizontalTemplate: FrameworkElement;
        private $HorizontalLargeIncrease: Primitives.RepeatButton;
        private $HorizontalLargeDecrease: Primitives.RepeatButton;
        private $HorizontalThumb: Primitives.Thumb;

        private $VerticalTemplate: FrameworkElement;
        private $VerticalLargeIncrease: Primitives.RepeatButton;
        private $VerticalLargeDecrease: Primitives.RepeatButton;
        private $VerticalThumb: Primitives.Thumb;

        private _GetChildOfType(name: string, type: Function): any {
            var temp = this.GetTemplateChild(name);
            if (temp instanceof type)
                return temp;
        }

        OnApplyTemplate() {
            super.OnApplyTemplate();
            this.$HorizontalTemplate = this._GetChildOfType("HorizontalTemplate", FrameworkElement);
            this.$HorizontalLargeIncrease = this._GetChildOfType("HorizontalTrackLargeChangeIncreaseRepeatButton", Primitives.RepeatButton);
            this.$HorizontalLargeDecrease = this._GetChildOfType("HorizontalTrackLargeChangeDecreaseRepeatButton", Primitives.RepeatButton);
            this.$HorizontalThumb = this._GetChildOfType("HorizontalThumb", Primitives.Thumb);
            this.$VerticalTemplate = this._GetChildOfType("VerticalTemplate", Fayde.FrameworkElement);
            this.$VerticalLargeIncrease = this._GetChildOfType("VerticalTrackLargeChangeIncreaseRepeatButton", Primitives.RepeatButton);
            this.$VerticalLargeDecrease = this._GetChildOfType("VerticalTrackLargeChangeDecreaseRepeatButton", Primitives.RepeatButton);
            this.$VerticalThumb = this._GetChildOfType("VerticalThumb", Primitives.Thumb);

            if (this.$HorizontalThumb != null) {
                this.$HorizontalThumb.DragStarted.Subscribe(this._OnThumbDragStarted, this);
                this.$HorizontalThumb.DragDelta.Subscribe(this._OnThumbDragDelta, this);
            }
            if (this.$HorizontalLargeDecrease != null) {
                this.$HorizontalLargeDecrease.Click.Subscribe(function (sender, e) { this.Focus(); this.Value -= this.LargeChange; }, this);
            }
            if (this.$HorizontalLargeIncrease != null) {
                this.$HorizontalLargeIncrease.Click.Subscribe(function (sender, e) { this.Focus(); this.Value += this.LargeChange; }, this);
            }

            if (this.$VerticalThumb != null) {
                this.$VerticalThumb.DragStarted.Subscribe(this._OnThumbDragStarted, this);
                this.$VerticalThumb.DragDelta.Subscribe(this._OnThumbDragDelta, this);
            }
            if (this.$VerticalLargeDecrease != null) {
                this.$VerticalLargeDecrease.Click.Subscribe(function (sender, e) { this.Focus(); this.Value -= this.LargeChange; }, this);
            }
            if (this.$VerticalLargeIncrease != null) {
                this.$VerticalLargeIncrease.Click.Subscribe(function (sender, e) { this.Focus(); this.Value += this.LargeChange; }, this);
            }

            this._OnOrientationChanged();
            this.UpdateVisualState(false);
        }

        OnIsEnabledChanged(e: IDependencyPropertyChangedEventArgs) {
            super.OnIsEnabledChanged(e);
            this.UpdateVisualState();
        }

        OnMinimumChanged(oldMin: number, newMin: number) {
            super.OnMinimumChanged(oldMin, newMin);
            this._UpdateTrackLayout();
        }
        OnMaximumChanged(oldMax: number, newMax: number) {
            super.OnMaximumChanged(oldMax, newMax);
            this._UpdateTrackLayout();
        }
        OnValueChanged(oldValue: number, newValue: number) {
            super.OnValueChanged(oldValue, newValue);
            this._UpdateTrackLayout();
        }

        private _HandleSizeChanged(sender, e: SizeChangedEventArgs) {
            this._UpdateTrackLayout();
        }
        private _OnOrientationChanged() {
            var isHorizontal = this.Orientation === Orientation.Horizontal;
            if (this.$HorizontalTemplate != null)
                this.$HorizontalTemplate.Visibility = isHorizontal ? Visibility.Visible : Visibility.Collapsed;
            if (this.$VerticalTemplate != null)
                this.$VerticalTemplate.Visibility = !isHorizontal ? Visibility.Visible : Visibility.Collapsed;
            this._UpdateTrackLayout();
        }
        private _UpdateTrackLayout() {
            var max = this.Maximum;
            var min = this.Minimum;
            var val = this.Value;
            
            var isHorizontal = this.Orientation === Orientation.Horizontal;
            var temp = isHorizontal ? this.$HorizontalTemplate : this.$VerticalTemplate;
            if (!(temp instanceof Grid))
                return;
            var templateGrid = <Grid>temp;
            
            var isReversed = this.IsDirectionReversed;
            var largeDecrease: Primitives.RepeatButton;
            var largeIncrease: Primitives.RepeatButton;
            var thumb: Primitives.Thumb;
            if (isHorizontal) {
                var coldefs = templateGrid.ColumnDefinitions;
                largeDecrease = this.$HorizontalLargeDecrease;
                largeIncrease = this.$HorizontalLargeIncrease;
                thumb = this.$HorizontalThumb;

                if (coldefs && coldefs.Count === 3) {
                    (<ColumnDefinition>coldefs.GetValueAt(0)).Width = new GridLength(1, isReversed ? GridUnitType.Star : GridUnitType.Auto);
                    (<ColumnDefinition>coldefs.GetValueAt(2)).Width = new GridLength(1, isReversed ? GridUnitType.Auto : GridUnitType.Star);

                    if (largeDecrease != null)
                        Grid.SetColumn(largeDecrease, isReversed ? 2 : 0);
                    if (largeIncrease != null)
                        Grid.SetColumn(largeIncrease, isReversed ? 0 : 2);
                }
            } else {
                var rowdefs = templateGrid.RowDefinitions;
                largeDecrease = this.$VerticalLargeDecrease;
                largeIncrease = this.$VerticalLargeIncrease;
                thumb = this.$VerticalThumb;

                if (rowdefs && rowdefs.Count === 3) {
                    (<RowDefinition>rowdefs.GetValueAt(0)).Height = new GridLength(1, isReversed ? GridUnitType.Auto : GridUnitType.Star);
                    (<RowDefinition>rowdefs.GetValueAt(2)).Height = new GridLength(1, isReversed ? GridUnitType.Star : GridUnitType.Auto);

                    if (largeDecrease != null)
                        Grid.SetRow(largeDecrease, isReversed ? 0 : 2);
                    if (largeIncrease != null)
                        Grid.SetRow(largeIncrease, isReversed ? 2 : 0);
                }
            }

            if (max === min)
                return;
            var percent = val / (max - min);
            if (largeDecrease != null && thumb != null) {
                if (isHorizontal)
                    largeDecrease.Width = Math.max(0, percent * (this.ActualWidth - thumb.ActualWidth));
                else
                    largeDecrease.Height = Math.max(0, percent * (this.ActualHeight - thumb.ActualHeight));
            }

        }

        private _OnThumbDragStarted(sender, e: Primitives.DragStartedEventArgs) {
            this.Focus();
            this._DragValue = this.Value;
        }
        private _OnThumbDragDelta(sender, e: Primitives.DragDeltaEventArgs) {
            var offset = 0;
            var isHorizontal = this.Orientation === Orientation.Horizontal;
            if (isHorizontal && this.$HorizontalThumb != null) {
                offset = e.HorizontalChange / (this.ActualWidth - this.$HorizontalThumb.ActualWidth) * (this.Maximum - this.Minimum);
            } else if (!isHorizontal && this.$VerticalThumb != null) {
                offset = -e.VerticalChange / (this.ActualHeight - this.$VerticalThumb.ActualHeight) * (this.Maximum - this.Minimum);
            }
            if (!isNaN(offset) && isFinite(offset)) {
                this._DragValue += this.IsDirectionReversed ? -offset : offset;
                var newValue = Math.min(this.Maximum, Math.max(this.Minimum, this._DragValue));
                if (newValue != this.Value)
                    this.Value = newValue;
            }
        }

        OnMouseEnter(e: Input.MouseEventArgs) {
            super.OnMouseEnter(e);
            if ((this.Orientation === Fayde.Orientation.Horizontal && this.$HorizontalThumb != null && this.$HorizontalThumb.IsDragging) ||
                (this.Orientation === Fayde.Orientation.Vertical && this.$VerticalThumb != null && this.$VerticalThumb.IsDragging)) {
                this.UpdateVisualState();
            }
        }
        OnMouseLeave(e: Input.MouseEventArgs) {
            super.OnMouseLeave(e);
            if ((this.Orientation === Fayde.Orientation.Horizontal && this.$HorizontalThumb != null && this.$HorizontalThumb.IsDragging) ||
                (this.Orientation === Fayde.Orientation.Vertical && this.$VerticalThumb != null && this.$VerticalThumb.IsDragging)) {
                this.UpdateVisualState();
            }
        }
        OnMouseLeftButtonDown(e: Input.MouseButtonEventArgs) {
            super.OnMouseLeftButtonDown(e);
            if (e.Handled)
                return;
            e.Handled = true;
            this.Focus();
            this.CaptureMouse();
        }
        OnLostMouseCapture(e: Input.MouseEventArgs) {
            super.OnLostMouseCapture(e);
            this.UpdateVisualState();
        }

        OnKeyDown(e: Input.KeyEventArgs) {
            super.OnKeyDown(e);
            if (e.Handled)
                return;
            if (!this.IsEnabled)
                return;

            switch (e.Key) {
                case Input.Key.Left:
                case Input.Key.Down:
                    this.Value += (this.IsDirectionReversed ? this.SmallChange : -this.SmallChange);
                    break;
                case Input.Key.Right:
                case Input.Key.Up:
                    this.Value += (this.IsDirectionReversed ? -this.SmallChange : this.SmallChange);
                    break;
                case Input.Key.Home:
                    this.Value = this.Minimum;
                    break;
                case Input.Key.End:
                    this.Value = this.Maximum;
                    break;
            }

        }

        OnGotFocus(e: RoutedEventArgs) {
            super.OnGotFocus(e);
            this.SetValueInternal(Slider.IsFocusedProperty, true);
        }
        OnLostFocus(e: RoutedEventArgs) {
            super.OnLostFocus(e);
            this.SetValueInternal(Slider.IsFocusedProperty, false);
        }
    }
    Fayde.RegisterType(Slider, {
    	Name: "Slider",
    	Namespace: "Fayde.Controls",
    	XmlNamespace: Fayde.XMLNS
    });
}