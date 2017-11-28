import { CompositeDecorator, Entity } from 'draft-js'
import React from 'react'
import { Tooltip } from 'antd'
import createReactClass from 'create-react-class'
import styles from './EditorDecorator.scss'

// Link
const Link = createReactClass({
	handleClickLink(url) {
		const win = window.open(url, '_blank')
		win.focus()
	},
	render(){
		const {
			entityKey,
			children,
		} = this.props
		const {
			url,
		} = Entity.get(entityKey).getData()

		return (
			<a className={styles.link} onClick={() => this.handleClickLink(url)}>{children}</a>
		)
	},
})
function findLinkEntities(contentBlock, callback) {
	contentBlock.findEntityRanges(
		(character) => {
			const entityKey = character.getEntity()
			return (
				entityKey !== null &&
				Entity.get(entityKey).getType() === 'LINK'
			)
		},
		callback
	)
}

// Replace part
function findReplaceEntities(contentBlock, callback) {
	contentBlock.findEntityRanges(
		(character) => {
			const entityKey = character.getEntity()
			return (
				entityKey !== null &&
				Entity.get(entityKey).getType() === 'REPLACE'
			)
		},
		callback
	)
}
const Replace = React.createClass({
	render(){
		const {
			entityKey,
		} = this.props
		const {
			text,
		} = Entity.get(entityKey).getData()

		return (
			<Tooltip placement="bottom" title="修改的内容">
				<div style={{ backgroundColor: '#ffdd89' }} className={styles.diffEntity}><span style={{ color: '#e77509', verticalAlign: 'sub', whiteSpace: 'nowrap', marginRight: 5, marginLeft: 5 }}> * </span>{text}</div>
			</Tooltip>
		)
	},
})

// Delete part
function findDeleteEntities(contentBlock, callback) {
	contentBlock.findEntityRanges(
		(character) => {
			const entityKey = character.getEntity()
			return (
				entityKey !== null &&
				Entity.get(entityKey).getType() === 'DELETE'
			)
		},
		callback
	)
}
const Delete = React.createClass({
	render(){
		const {
			entityKey,
		} = this.props
		const {
			text,
		} = Entity.get(entityKey).getData()

		return (
			<Tooltip placement="bottom" title="删除的内容">
				<div style={{ backgroundColor: '#ffb6b6' }} className={styles.diffEntity}><span style={{ color: '#c30016', whiteSpace: 'nowrap', marginRight: 5, marginLeft: 5 }}> - </span>{text}</div>
			</Tooltip>
		)
	},
})

// Insert part
function findInsertEntities(contentBlock, callback) {
	contentBlock.findEntityRanges(
		(character) => {
			const entityKey = character.getEntity()
			return (
				entityKey !== null &&
				Entity.get(entityKey).getType() === 'INSERT'
			)
		},
		callback
	)
}
const Insert = React.createClass({
	render(){
		const {
			entityKey,
		} = this.props
		const {
			text,
		} = Entity.get(entityKey).getData()

		return (
			<Tooltip placement="bottom" title="新增的内容">
				<div style={{ backgroundColor: '#b8e986' }} className={styles.diffEntity}><span style={{ color: '#278503', whiteSpace: 'nowrap', marginRight: 5, marginLeft: 5 }}> + </span>{text}</div>
			</Tooltip>
		)
	},
})

const EditorDecorator = new CompositeDecorator([{
	strategy: findLinkEntities,
	component: Link,
}, {
	strategy: findReplaceEntities,
	component: Replace,
}, {
	strategy: findDeleteEntities,
	component: Delete,
}, {
	strategy: findInsertEntities,
	component: Insert,
}])

export default EditorDecorator
