// @flow
import Context from './Context';
import { markAsGLComponent, isGLComponent } from './internal/GLComponentRegistry';
import type { GoldenLayoutItem } from './Types';

import React from 'react';
import type { ChildrenArray } from 'react';

function createReactContentItem(parentItem : any, component : any) {
    let config;
    let reactComponent;
    if (component.__react_component) {
        reactComponent = component.__react_component;
        config = Object.assign({}, component);
    } else {
        reactComponent = component;
        config = {
            type: 'react-component',
            component: undefined
        };
    }

    const name = reactComponent.displayName || reactComponent.name;
    config.component = name;

    try {
        parentItem.layoutManager.registerComponent(name, reactComponent);
    } catch (e) {
        // There's a throw if the component is already registered - ignore it.
    }

    const contentItem = parentItem.layoutManager.createContentItem(config);
    parentItem.addChild(contentItem);
}


type ContentItemState = {
    item: ?GoldenLayoutItem;
};

/**
 * React properties for the {@link ContentItem} component.
 */
export type ContentItemProps = {
    type: string;
    children: ChildrenArray<any>;
    itemRef?: (GoldenLayoutItem) => mixed;
};

/**
 * Create a new GoldenLayout ContentItem.
 *
 * Note: You probably don't want to use this class directly, see:
 * * {@link Row}
 * * {@link Column}
 * * {@link Stack}
 */
export default class ContentItem extends React.Component<ContentItemProps, ContentItemState> {
    id : string;

    constructor(props : ContentItemProps) {
        super(props);
        const newBuffer = new Uint8Array(16);
        window.crypto.getRandomValues(newBuffer);
        this.id = `item-${btoa(newBuffer.toString())}`; // TODO less stupid ID generation
        this.state = {
            item: null
        };
    }

    componentWillUnmount() {
        if (this.state.item != null) {
            this.state.item.remove();
        }
    }

    render() {
        const goldenLayoutComponents = [];
        const components = [];
        let children;
        if (this.props.children != null) {
            children = Array.isArray(this.props.children) ? this.props.children : [this.props.children];
        }

        if (children) {
            children.map(x => {
                if (x.type && (isGLComponent(x.type) || (typeof x.type.__reactstandin__getCurrent === 'function' && isGLComponent(x.type.__reactstandin__getCurrent())))) {
                    goldenLayoutComponents.push(x);
                } else {
                    components.push(x);
                }
            });
        }

        return <Context.Consumer>
            {(item) => {
                if (item) {
                    this.__addItem(item, components);
                }

                return <Context.Provider value={this.state.item}>
                    {goldenLayoutComponents}
                </Context.Provider>
            }}
        </Context.Consumer>;
    }

    __addItem(parentItem : any, components : any[]) {
        if (!this.state.item) {
            const existingItems = parentItem.getItemsById(this.id);
            const newItem = parentItem.layoutManager.createContentItem({
                type: this.props.type,
                id: this.id,
                content: []
            }, parentItem);

            parentItem.addChild(newItem);
            components.forEach(comp => createReactContentItem(newItem, comp));
            this.setState({ item: newItem });
            if (this.props.itemRef)
                this.props.itemRef(newItem);
        }
    }
};

markAsGLComponent(ContentItem);
