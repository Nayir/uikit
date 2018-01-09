import TransitionerPlugin from './internal/slider-transitioner';
import {speedUp} from '../mixin/slideshow';

function plugin(UIkit) {

    if (plugin.installed) {
        return;
    }

    var {mixin} = UIkit;
    var {$$, css, data, fastdom, includes, isNumeric, toggleClass, toFloat} = UIkit.util;
    var Transitioner = TransitionerPlugin(UIkit);

    UIkit.component('slider', {

        mixins: [mixin.class, mixin.slideshow],

        props: {
            center: Boolean,
            sets: Boolean,
        },

        defaults: {
            center: false,
            sets: false,
            attrItem: 'uk-slider-item',
            selList: '.uk-slider-items',
            selNav: '.uk-slider-nav',
            Transitioner
        },

        computed: {

            finite({finite}) {
                return finite || Transitioner.getWidth(this.list) < this.list.offsetWidth + Transitioner.getMaxWidth(this.list) + this.center;
            },

            maxIndex() {

                if (!this.finite || this.center) {
                    return this.length - 1;
                }

                css(this.slides, 'order', '');

                var max = Transitioner.getMax(this.list), i = this.length;

                while (i--) {
                    if (Transitioner.getElLeft(this.list.children[i], this.list) < max) {
                        return Math.min(i + 1, this.length - 1);
                    }
                }

                return 0;
            },

            sets({sets}) {

                var width = this.list.offsetWidth / (this.center ? 2 : 1),
                    left = 0;

                css(this.slides, 'order', '');

                return sets && this.slides.reduce((sets, slide, i) => {

                    if (Transitioner.getElLeft(slide, this.list) + slide.offsetWidth > left) {

                        if (i > this.maxIndex) {
                            i = this.maxIndex;
                        }

                        if (!includes(sets, i)) {
                            sets.push(i);
                            left = Transitioner.getElLeft(slide, this.list) + width + (this.center ? slide.offsetWidth / 2 : 0);
                        }
                    }

                    return sets;

                }, []);

            },

            transitionOptions() {
                return {
                    center: this.center,
                    list: this.list
                };
            }

        },

        ready() {
            fastdom.write(() => this.show(this.getValidIndex()));
        },

        update: {

            read() {
                this._resetComputeds();
            },

            write() {

                $$(`[${this.attrItem}],[data-${this.attrItem}]`, this.$el).forEach(el => {
                    var index = data(el, this.attrItem);
                    this.maxIndex && toggleClass(el, 'uk-hidden', isNumeric(index) && (this.sets && !includes(this.sets, toFloat(index)) || index > this.maxIndex));
                });

            },

            events: ['load', 'resize']

        },

        events: [

            {

                name: 'beforeitemshow',

                self: true,

                delegate() {
                    return `${this.selList} > *`;
                },

                handler(e) {

                    if (!this.dragging && this.sets && this.stack.length < 2 && !includes(this.sets, this.index)) {
                        this.index = this.getValidIndex();
                    }

                    var diff = Math.abs(this.index + (this.dir > 0
                        ? this.index < this.prevIndex ? this.maxIndex + 1 : 0
                        : this.index > this.prevIndex ? -this.maxIndex : 0
                    ) - this.prevIndex);

                    if (!this.dragging && diff > 1) {

                        for (var i = 0; i < diff; i++) {
                            this.stack.splice(1, 0, this.dir > 0 ? 'next' : 'previous');
                        }

                        e.preventDefault();
                        return;
                    }

                    this.duration = speedUp((this.dir < 0 || !this.slides[this.prevIndex] ? this.slides[this.index] : this.slides[this.prevIndex]).offsetWidth / this.velocity);

                    this.reorder();

                }

            }

        ],

        methods: {

            reorder() {

                css(this.slides, 'order', '');

                if (this.finite) {
                    return;
                }

                this.slides.forEach((slide, i) =>
                    css(slide, 'order', this.dir > 0 && i < this.prevIndex
                        ? 1
                        : this.dir < 0 && i >= this.index
                            ? -1
                            : ''
                    )
                );

                if (!this.center) {
                    return;
                }

                var index = this.dir > 0 ? this.prevIndex : this.index,
                    next = this.slides[index],
                    width = this.list.offsetWidth / 2 - next.offsetWidth / 2,
                    j = 0;

                while (width >= 0) {
                    var slideIndex = this.getIndex(--j + index, index),
                        slide = this.slides[slideIndex];

                    css(slide, 'order', slideIndex > index ? -2 : -1);
                    width -= slide.offsetWidth;
                }

            },

            getValidIndex(index = this.index, prevIndex = this.prevIndex) {

                index = this.getIndex(index, prevIndex);

                if (!this.sets) {
                    return index;
                }

                var prev;

                do {

                    if (includes(this.sets, index)) {
                        return index;
                    }

                    prev = index;
                    index = this.getIndex(index + this.dir, prevIndex);

                } while (index !== prev);

                return index;
            }

        }

    });

}

if (!BUNDLED && typeof window !== 'undefined' && window.UIkit) {
    window.UIkit.use(plugin);
}

export default plugin;
