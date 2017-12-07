import React from 'react'
import PropTypes from 'prop-types'
import createReactClass from 'create-react-class'
import { connect } from 'react-redux'
import { Modal, Button, Row, Col, Tooltip, Input, Icon, Progress, message } from 'antd'
import { BLOCK_TYPES, INLINE_STYLES, COLOR_STYLE_MAP } from './constant'
import { RichUtils, EditorState, Modifier, Entity, AtomicBlockUtils, CharacterMetadata, ContentBlock, ContentState, genKey, SelectionState } from 'draft-js'
import { join } from 'lodash'
import TableComponent from './Table'
import styles from './EditorControl.scss'
import classNames from 'classnames'
import _ from 'lodash'
import { List, Repeat, fromJS } from 'immutable'
import MultipartVideoUploadMixin from 'mixins/multipart-video-upload-mixin'
import plyr from 'plyr'
import config from '../../config'

const getToolTipTitle = function(type){
	switch (type) {
	case 'simuicon-h1':
		return '大标题'
	case 'simuicon-h2':
		return '中标题'
	case 'simuicon-h3':
		return '小标题'
	case 'simuicon-formatequote':
		return '引用'
	case 'simuicon-codeblock':
		return '代码'
	case 'simuicon-formatebold':
		return '加粗'
	case 'simuicon-formateitalic':
		return '倾斜'
	default:
		return '其他'
	}
}

export const inlineStyleMap = { ...COLOR_STYLE_MAP }

const blockDataStyleMap = {
	textAlignment: {
		center: 'alignment-center',
		left: 'alignment-left',
		right: 'alignment-right',
	}
}

export const getBlockStyle = (block) => {
	const blockDataClassName = block.getData().reduce((reduction, v, k) => {
		if (blockDataStyleMap[k]) {
			reduction.push(blockDataStyleMap[k][v])
		}
		return reduction
	}, [])

	switch (block.getType()) {
	case 'blockquote':
		return classNames(blockDataClassName, 'RichEditor-blockquote')
	case 'unstyled':
		return classNames(blockDataClassName, 'Main-body')
	default:
		return classNames(blockDataClassName)
	}
}

export const getBlockRender = function(block) {
	if (block.getType() === 'atomic') {
		const entityType = Entity.get(block.getEntityAt(0)).getType()
		const entityData = Entity.get(block.getEntityAt(0)).getData()
		const editable = this.state.isEditMode !== undefined ? this.state.isEditMode : true
		switch (entityType) {
		case 'MEDIA':
			if (entityData.type === 'video') {
				return {
					component: VideoComponent,
					editable: false,
				}
			} else {
				return {
					component: PhotoComponent,
					editable: false,
				}
			}
		case 'table':
			return {
				component: TableComponent,
				editable,
				props: {
					tableData: fromJS(entityData.data),
					isEditable: editable,
					onStartEdit: (blockKey) => {
						if (this.state.liveEdits) {
							this.setState({
								liveEdits: this.state.liveEdits.set(blockKey)
							})
						}
					},
					onFinishEdit: (blockKey) => {
						if (this.state.liveEdits) {
							this.setState({
								liveEdits: this.state.liveEdits.remove(blockKey)
							})
						}
					},
				}
			}
		default:
			return null
		}
	} else {
		return null
	}
}

class PhotoComponent extends React.Component {
	state = {
		loading: 'hidden',
	}

  constructor(props) {
    super(props)
  }

	handleImageLoaded = () => {
		this.setState({ loading: 'visible' })
	}

	render(){
		const entity = Entity.get(this.props.block.getEntityAt(0))
		const { src } = entity.getData()
		const { loading } = this.state

		return (
			<div className={styles.imgContainer}>
				<img style={{ visibility: loading }} className={styles.insertPhoto} src={src} onLoad={this.handleImageLoaded} />
				{/* <img className={styles.insertPhoto} src={src} onLoad={this.handleImageLoaded} /> */}
			</div>
		)
	}
}

class VideoComponent extends React.Component {
	componentDidMount() {
		plyr.setup(this.refs.video, {})
	}

	render() {
		const entity = Entity.get(this.props.block.getEntityAt(0))
		const {
			src
		} = entity.getData()
		return (
			<div style={{ 'textAlign':'center', margin: '5px auto', maxWidth: 600 }}>
				<video preload="metadata" ref="video" poster="" controls>
					<source src={src}/>
				</video>
			</div>
		)
	}
}

class BlockStyleButton extends React.Component {
	static propTypes = {
		editorState: PropTypes.object.isRequired,
		type: PropTypes.object.isRequired,
		onChange: PropTypes.func.isRequired,
		isMarkDownMode: PropTypes.bool,
	}

	handleClick = e => {
		e.preventDefault()
		if (this.props.isMarkDownMode){
			let text = ''
			switch (this.props.type) {
			case BLOCK_TYPES.h1:
				text = '# '
				break
			case BLOCK_TYPES.h2:
				text = '## '
				break
			case BLOCK_TYPES.h3:
				text = '### '
				break
			case BLOCK_TYPES.blockquote:
				text = '> '
				break
			case BLOCK_TYPES.code:
				text = '```'
				break
			default:
				text = '# '
			}
			let blocks = this.props.editorState.getCurrentContent().getBlockMap()
			const targetRange = this.props.editorState.getSelection()
			const blockKey = targetRange.getStartKey()
			let newContentState
			let newEditorState
			if (text !== '```'){
				const currentText = text + blocks.get(blockKey).getText()
				const newBlock = new ContentBlock({
					key: blockKey,
					type: 'unstyled',
					text: currentText,
					characterList: List(Repeat(CharacterMetadata.create(), currentText.length)),
				})
				blocks = blocks.set(blockKey, newBlock)
				newContentState = ContentState.createFromBlockArray(blocks.toArray())
				newEditorState = EditorState.createWithContent(newContentState)
			} else {
				const preBlock = new ContentBlock({
					key: genKey(),
					type: 'unstyled',
					text: text,
					characterList: List(Repeat(CharacterMetadata.create(), 3))
				})
				const afterBlock = new ContentBlock({
					key: genKey(),
					type: 'unstyled',
					text: text,
					characterList: List(Repeat(CharacterMetadata.create(), 3))
				})
				let blocksArray = blocks.toArray()
				let newBlocksArray = []
				for (let b of blocksArray){
					if (b.getKey()!=blockKey){
						newBlocksArray.push(b)
					} else {
						newBlocksArray.push(preBlock)
						newBlocksArray.push(b)
						newBlocksArray.push(afterBlock)
					}
				}
				newContentState = ContentState.createFromBlockArray(newBlocksArray)
				newEditorState = EditorState.createWithContent(newContentState)
				newEditorState = EditorState.forceSelection(newEditorState, targetRange)
			}
			this.props.onChange(newEditorState)
		} else {
			this.props.onChange(RichUtils.toggleBlockType(
				this.props.editorState,
				this.props.type.style,
			))
		}
	}

	render() {
		const {
			editorState,
			type,
		} = this.props
		const selection = editorState.getSelection()
		const blockType = editorState
			.getCurrentContent()
			.getBlockForKey(selection.getStartKey())
			.getType()

		const iconClassName = {
			[styles.blockStyleButton]: true,
			[styles.activeBlockStyleButton]: blockType === type.style,
			[type.label]: true,
		}

		return (
			<Tooltip overlayClassName={styles.tooltip} placement="top" title={getToolTipTitle(type.label)}>
				<span onMouseDown={this.handleClick} className={classNames(iconClassName)} />
			</Tooltip>
		)
	}
}

class InlineStyleButton extends React.Component {
	static propTypes = {
		editorState: PropTypes.object.isRequired,
		type: PropTypes.object.isRequired,
		onChange: PropTypes.func.isRequired,
		isMarkDownMode: PropTypes.bool.isRequired,
		enable: PropTypes.bool.isRequired,
	}

	handleClick = e => {
		e.preventDefault()

		if (!this.props.enable) return

		if (this.props.isMarkDownMode){
			let text = ''
			switch (this.props.type) {
			case INLINE_STYLES.bold:
				text = '**'
				break
			case INLINE_STYLES.italic:
				text = '_'
				break
			default:
				text = '**'
			}
			const targetRange = this.props.editorState.getSelection()
			const start = targetRange.getStartOffset()
			const end = targetRange.getEndOffset()
			const startBlockKey = targetRange.getStartKey()
			const endBlockKey = targetRange.getEndKey()
			const contentState = this.props.editorState.getCurrentContent()
			let newContentState
			let newTargetRange
			if (start === end && startBlockKey === endBlockKey){
				// Insert ** or _
				newContentState = Modifier.insertText(
					contentState,
					targetRange,
					text+text
				)
				newTargetRange = targetRange.merge({ anchorOffset:end+text.length, focusOffset:end+text.length })
			} else {
				// Wrap selection with ** or _
				if (startBlockKey === endBlockKey){
					const selectedText = contentState.getBlockMap().get(startBlockKey).getText().slice(start, end)
					newContentState = Modifier.replaceText(
						contentState,
						targetRange,
						text+selectedText+text
					)
					newTargetRange = targetRange.merge({ anchorOffset:end+text.length, focusOffset:end+text.length })
				} else {
					// Select more than one block
					const blocksArray = contentState.getBlockMap().toArray()
					let renderText
					let renderSelection
					let startToRender = false
					blocksArray.forEach((b) => {
						if (b.getKey() == startBlockKey){
							startToRender = true
							renderText = b.getText().slice(start)
							const emptySelection = SelectionState.createEmpty(b.getKey())
							renderSelection = emptySelection.merge({ anchorOffset: start, focusOffset: b.getText().length, isBackward: false, hasFocus: false, anchorKey: b.getKey(), focusKey: b.getKey() })
							newContentState = Modifier.replaceText(
								contentState,
								renderSelection,
								text+renderText+text
							)
							if (targetRange.getIsBackward()){
								newTargetRange = renderSelection.merge({ anchorOffset: start+text.length, focusOffset: start+text.length })
							}
						} else if (startToRender && b.getKey() != endBlockKey){
							renderText = b.getText()
							const emptySelection = SelectionState.createEmpty(b.getKey())
							renderSelection = emptySelection.merge({ anchorOffset: 0, focusOffset: b.getText().length, isBackward: false, hasFocus: false, anchorKey: b.getKey(), focusKey: b.getKey() })
							newContentState = Modifier.replaceText(
								newContentState,
								renderSelection,
								text+renderText+text
							)
						} else if (b.getKey() == endBlockKey){
							startToRender = false
							renderText = b.getText().slice(0, end)
							const emptySelection = SelectionState.createEmpty(b.getKey())
							renderSelection = emptySelection.merge({ anchorOffset: 0, focusOffset: end, isBackward: false, hasFocus: false, anchorKey: b.getKey(), focusKey: b.getKey() })
							newContentState = Modifier.replaceText(
								newContentState,
								renderSelection,
								text+renderText+text
							)
							if (!targetRange.getIsBackward()){
								newTargetRange = renderSelection.merge({ anchorOffset: end+text.length, focusOffset: end+text.length })
							}
						}
					})
				}
			}
			let newEditorState = EditorState.createWithContent(newContentState)
			newEditorState = EditorState.forceSelection(newEditorState, newTargetRange)
			this.props.onChange(newEditorState)
		} else {
			this.props.onChange(RichUtils.toggleInlineStyle(
				this.props.editorState,
				this.props.type.style,
			))
		}
	}

	render() {
		const {
			editorState,
			type,
		} = this.props
		const currentStyle = editorState.getCurrentInlineStyle()

		const iconClassName = {
			[styles.blockStyleButton]: true,
			[styles.activeBlockStyleButton]: currentStyle.has(type.style),
			[type.label]: true,
		}

		return (
			<Tooltip overlayClassName={styles.tooltip} placement="top" title={getToolTipTitle(type.label)}>
				<span onMouseDown={this.handleClick} className={classNames(iconClassName)} />
			</Tooltip>
		)
	}
}

class InlineColorButton extends React.Component {
	static propTypes = {
		editorState: PropTypes.object.isRequired,
		label: PropTypes.string.isRequired,
		onChange: PropTypes.func.isRequired,
		style: PropTypes.string.isRequired,
		afterToggle: PropTypes.func.isRequired,
	}

	handleToggle = e => {
		e.preventDefault()
		const { editorState } = this.props
		const toggledColor = this.props.style
		const selection = editorState.getSelection()

		// Allow one color at a time. Turn off all active colors.
		const nextContentState = Object.keys(COLOR_STYLE_MAP)
			.reduce((contentState, color) => {
				return Modifier.removeInlineStyle(contentState, selection, color)
			}, editorState.getCurrentContent())

		let nextEditorState = EditorState.push(
			editorState,
			nextContentState,
			'change-inline-style'
		)

		const currentStyle = editorState.getCurrentInlineStyle()

		// Unset style override for current color.
		if (selection.isCollapsed()) {
			nextEditorState = currentStyle.reduce((state, color) => {
				// return RichUtils.toggleInlineStyle(state, color);
				if (Object.keys(COLOR_STYLE_MAP).indexOf(color)<0){
					if (!state.getCurrentInlineStyle().has(color)){
						state = RichUtils.toggleInlineStyle(state, color)
					}
				} else {
					state = RichUtils.toggleInlineStyle(state, color)
				}
				return state
			}, nextEditorState)
		}

		// If the color is being toggled on, apply it.
		if (!currentStyle.has(toggledColor)) {
			nextEditorState = RichUtils.toggleInlineStyle(
				nextEditorState,
				toggledColor
			)
		}

		this.props.onChange(nextEditorState)
		this.props.afterToggle()
	}

	render() {
		return (
			<div className={styles.colorSpan} style={{ 'backgroundColor':COLOR_STYLE_MAP[this.props.style].color }} onMouseDown={this.handleToggle} />
		)
	}
}

class ColorPickerIcon extends React.Component {
	static propTypes = {
		editorState: PropTypes.object.isRequired,
	}

	render() {
		const {
			editorState,
		} = this.props

		const currentInlineStyle = editorState.getCurrentInlineStyle()

		const intersect = currentInlineStyle.intersect(Object.keys(COLOR_STYLE_MAP))

		const color = intersect.size ? COLOR_STYLE_MAP[intersect.first()].color : '#4a4a4a'

		return (
			<svg width="14px" height="14px" viewBox="147 8 18 18" version="1.1">
				<g id="ic_format_color_text" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd" transform="translate(147.000000, 8.000000)">
					<g id="colorIconGroup">
						<polygon id="shapeAbove" points="0 0 18 0 18 18 0 18" />
						<polygon id="shapeBelow" fill={color} points="0 15 18 15 18 18 0 18" />
						<path d="M8.25,2.25 L4.125,12.75 L5.8125,12.75 L6.6525,10.5 L11.34,10.5 L12.18,12.75 L13.8675,12.75 L9.75,2.25 L8.25,2.25 L8.25,2.25 Z M7.215,9 L9,4.2525 L10.785,9 L7.215,9 L7.215,9 Z" id="形状" fill="#4A4A4A" />
					</g>
				</g>
			</svg>
		)
	}
}

class TableModal extends React.Component {
	static propTypes = {
		visibility:PropTypes.bool,
		onOK:PropTypes.func,
		onCancel:PropTypes.func
	}

	state = {
		rowInputVal:2,
		colInputVal:4
	}

	handleOK = () => {
		let row, col
		row = this.state.rowInputVal
		col = this.state.colInputVal
		this.props.onOK(row, col)
	}

	handleCancel = () => {
		this.props.onClose()
	}

	render() {
		return (
			<div className={styles.tableModal} onClick={(e) => {e.preventDefault();e.stopPropagation()}}>
				<div className={styles.modalContent}>
					<div className={styles.inputItem}><div className={styles.label}>行数量:</div><Input value={this.state.rowInputVal} onChange={(e) => {this.setState({ rowInputVal:e.target.value })}}/></div>
					<div className={styles.inputItem}><div className={styles.label}>列数量:</div><Input value={this.state.colInputVal} onChange={(e) => {this.setState({ colInputVal:e.target.value })}} /></div>
				</div>
				<div className={styles.modalFooter}>
					<Button type="ghost" onClick={this.handleOK}>确认</Button>
				</div>
			</div>
		)
	}
}

const EditorControl = createReactClass({
	propTypes: {
		onChange: PropTypes.func.isRequired,
		onImageUpload: PropTypes.func.isRequired,
		onEnterFullscreen: PropTypes.func.isRequired,
		isFullscreenMode: PropTypes.bool.isRequired,
		isMarkDownMode: PropTypes.bool.isRequired,
		onChangeMarkDownMode: PropTypes.func.isRequired,
		editorState: PropTypes.object.isRequired,
		className: PropTypes.string,
		affair: PropTypes.object,
	},

	mixins: [MultipartVideoUploadMixin],

	getInitialState() {
    return {
  		fileName: '',
  		showEditVideoModal: false,
  		editingVideo: null,
  		editingVideoName: '',
  		uploadApi: this.props.affair ? config.api.file.token.announcement() : ''
    }
	},

	componentDidMount() {
		this.props.isMarkDownMode ? null : window.addEventListener('mousedown', this.handleFadeOut)
	},

	componentWillUnmount() {
		this.props.isMarkDownMode ? null : window.removeEventListener('mousedown', this.handleFadeOut)
	},

	// 颜色面板控制
	handleFadeIn(e) {
		e.preventDefault()
		let board = this.refs.colorBoard
		board.style.display = board.style.display ? '' : 'none'
		this.refs.colorBoardTooltip.setState({ 'visible':false })
		this.refs.tableBoard.style.display = 'none'
		this.setState({ showLinkPanel: false })
		e.stopPropagation()
	},

	handleFadeOut() {
		if (!this.props.isMarkDownMode){
			let board = this.refs.colorBoard
			board.style.display = 'none'
			// this.refs.tableBoard.style.display = 'none'
		}
	},

	handleContentMouseDown(e) {
		e.preventDefault()
		e.stopPropagation()
	},

	handlePhotoSelected(e) {
		const files = e.target.files
		this.props.onImageUpload(files[0])
		e.target.value = ''
	},

	handleClickPhotoButton(e) {
		e.preventDefault()
		let blocks = this.props.editorState.getCurrentContent().getBlockMap().toArray()
		const targetRange = this.props.editorState.getSelection()
		const text = '![alt](url)'
		const newBlock = new ContentBlock({
			key: genKey(),
			type: 'unstyled',
			text,
			characterList: List(Repeat(CharacterMetadata.create(), text.length))
		})
		let newBlocksArray = []
		for (let b of blocks){
			if (b.getKey() === targetRange.getStartKey()){
				b.getText() == '' ? null : newBlocksArray.push(b)
				newBlocksArray.push(newBlock)
			} else {
				newBlocksArray.push(b)
			}
		}
		const renderSelection = SelectionState.createEmpty(newBlock.getKey()).merge({ anchorOffset: 2, focusOffset: 2, hasFocus: true })
		let newEditorState = EditorState.createWithContent(ContentState.createFromBlockArray(newBlocksArray))
		newEditorState = EditorState.forceSelection(newEditorState, renderSelection)
		this.props.onChange(newEditorState)
	},

	handleClickVideoButton(e){
		e.preventDefault()
		let blocks = this.props.editorState.getCurrentContent().getBlockMap().toArray()
		const text = '[![alt](poster)](url)'
		const targetRange = this.props.editorState.getSelection()
		const newBlock = new ContentBlock({
			key: genKey(),
			type: 'unstyled',
			text,
			characterList: List(Repeat(CharacterMetadata.create(), text.length))
		})
		let newBlocksArray = []
		for (let b of blocks){
			if (b.getKey() === targetRange.getStartKey()){
				b.getText() == '' ? null : newBlocksArray.push(b)
				newBlocksArray.push(newBlock)
			} else {
				newBlocksArray.push(b)
			}
		}
		const renderSelection = SelectionState.createEmpty(newBlock.getKey()).merge({ anchorOffset: 2, focusOffset: 2, hasFocus: true })
		let newEditorState = EditorState.createWithContent(ContentState.createFromBlockArray(newBlocksArray))
		newEditorState = EditorState.forceSelection(newEditorState, renderSelection)
		this.props.onChange(newEditorState)
	},

	handleClickLinkButton(e){
		e.preventDefault()
		e.stopPropagation()

		if (this.props.isMarkDownMode){
			let contentState = this.props.editorState.getCurrentContent()
			const targetRange = this.props.editorState.getSelection()
			const start = targetRange.getStartOffset()
			const end = targetRange.getEndOffset()
			let newContentState
			if (start == end){
				newContentState = Modifier.insertText(
					contentState,
					targetRange,
					'[]()'
				)
			} else {
				const selectedText = contentState.getBlockMap().get(targetRange.getStartKey()).getText().slice(start, end)
				newContentState = Modifier.replaceText(
					contentState,
					targetRange,
					'[]('+selectedText+')'
				)
			}
			let newTargetRange = targetRange.merge({ anchorOffset: start+1, focusOffset: start+1, hasFocus: true })
			let newEditorState = EditorState.createWithContent(newContentState)
			newEditorState = EditorState.forceSelection(newEditorState, newTargetRange)
			this.props.onChange(newEditorState)
		} else {
			this.refs.colorBoard.style.display = 'none'
			this.refs.tableBoard.style.display = 'none'
			this.setState({
				showLinkPanel: true,
			}, () => {
				this.refs.linkInput.refs.input.focus() //will make text selected lose highlight
			})
		}
	},

	handleClickTableButton(e) {
		e.preventDefault()
		e.stopPropagation()
		if (this.props.isMarkDownMode){
			const blocks = this.props.editorState.getCurrentContent().getBlockMap().toArray()
			const targetRange = this.props.editorState.getSelection()
			const tableLine1 = new ContentBlock({
				key: genKey(),
				type: 'unstyled',
				text: 'Header1|Header2|Header3',
				characterList: List(Repeat(CharacterMetadata.create(), 23))
			})
			const tableLine2 = new ContentBlock({
				key: genKey(),
				type: 'unstyled',
				text: '--|--|--',
				characterList: List(Repeat(CharacterMetadata.create(), 8))
			})
			const tableLine3 = new ContentBlock({
				key: genKey(),
				type: 'unstyled',
				text: 'Data1|Data2|Data3',
				characterList: List(Repeat(CharacterMetadata.create(), 17))
			})
			let newBlocksArray = []
			for (let b of blocks){
				if (b.getKey() === targetRange.getStartKey()){
					b.getText() == '' ? null : newBlocksArray.push(b)
					newBlocksArray.push(tableLine1)
					newBlocksArray.push(tableLine2)
					newBlocksArray.push(tableLine3)
				} else {
					newBlocksArray.push(b)
				}
			}
			const renderSelection = SelectionState.createEmpty(tableLine1.getKey()).merge({ anchorOffset: 7, focusOffset: 7, hasFocus: true })
			let newEditorState = EditorState.createWithContent(ContentState.createFromBlockArray(newBlocksArray))
			newEditorState = EditorState.forceSelection(newEditorState, renderSelection)
			this.props.onChange(newEditorState)
		} else {
			let board = this.refs.tableBoard
			board.style.display = board.style.display ? '' : 'none'
			this.refs.colorBoard.style.display = 'none'
			this.setState({ showLinkPanel: false })
			this.refs.tableBoardTooltip.setState({ 'visible':false })
			this.setState({
				showTableModal:true
			})
		}
	},

	handleVideoSelected(evt) {
		const file = evt.target.files[0]

		if ((Math.round(file.size * 100 / (1024 * 1024)) / 100) > 500) {
			message.error('文件过大')
			return
		} else {
			this.setState({
				showEditVideoModal: true,
				editingVideo: file,
				editingVideoName: file.name
			})
		}

		evt.target.value = null
	},

	handleAddLink() {
		const {
			editorState,
			onChange,
		} = this.props
		const regx = /^http|https:\/\/.*$/
		let url = this.refs.linkInput.refs.input.value

		if (!url){
			return
		}

		if (!regx.test(url)){
			url = 'http://'+url
		}
		const entityKey = Entity.create('LINK', 'MUTABLE', {
			url,
		})

		const selectedArea = editorState.getSelection()
		const selectedText = editorState.getCurrentContent().getBlockForKey(selectedArea.anchorKey).text.slice(selectedArea.anchorOffset, selectedArea.focusOffset)

		if (selectedText.trim() === ''){
			return
		}

		onChange(RichUtils.toggleLink(
			editorState,
			editorState.getSelection(),
			entityKey
		))
	},

	handleAddLinkByEnter(e) {
		if (e.key=='Enter'){
			this.handleAddLink()
			this.setState({ showLinkPanel: false })
		}
	},

	handleEditVideoCancel() {
		this.setState({
			showEditVideoModal: false,
			editingVideo: null,
			editingVideoName: '',
			videoProgress: 0,
			uploadId: null,
		})
		this.handleCancelUpload(this.state.editingVideo)
	},
	handleEditVideoCommit() {
		const file = this.state.editingVideo
		const fileName = this.state.editingVideoName

		if (join(fileName.split('.').slice(0, -1), '.') == '') {
			message.error('文件名不能为空')
		} else {
			this.handleUploadVideo(file, fileName, this.props.user.get('id'), this.handleUploadVideoComplete)
		}
	},
	handleUploadVideoComplete(res) {
		const videoURL = res.url.split('?')[0]
		const {
			editorState,
			onChange,
		} = this.props
		const entityKey = Entity.create('MEDIA', 'MUTABLE', {
			src: videoURL,
			type: 'video',
		})

		const nextEditorState = AtomicBlockUtils.insertAtomicBlock(editorState, entityKey, ' ')
		onChange(nextEditorState)

		this.setState({
			showEditVideoModal: false,
			editingVideo: null,
			editingVideoName: '',
			videoProgress: 0,
			uploadId: null,
		})
	},
	handleChangeTextAlignment(e, alignment) {
		e.preventDefault()

		const {
			editorState,
			onChange,
		} = this.props
		const newContentState = Modifier.setBlockData(editorState.getCurrentContent(), editorState.getSelection(), {
			textAlignment: alignment,
		})
		onChange(EditorState.push(editorState, newContentState))
	},
	createTable(row, col){
		const editorState = this.props.editorState
		const entityKey = Entity.create('table', 'MUTABLE', {
			columnCount: col,
			rowCount: row,
			data:_.map(_.range(row), () => (_.range(col).fill('')))
		})
		const nextEditorState = AtomicBlockUtils.insertAtomicBlock(editorState, entityKey, ' ')
		this.props.onChange(nextEditorState)
		let board = this.refs.tableBoard
		board.style.display = board.style.display ? '' : 'none'
	},


	// Render
	renderTextAlignGroup() {
		return (
			<div className={styles.textAlignGroup}>
				<Tooltip overlayClassName={styles.tooltip} placement="top" title="左对齐">
					<span onMouseDown={(e) => {this.handleChangeTextAlignment(e, 'left')}} className={`${styles.blockStyleButton} simuicon-alignleft`} />
				</Tooltip>
				<Tooltip overlayClassName={styles.tooltip} placement="top" title="中对齐">
					<span onMouseDown={(e) => {this.handleChangeTextAlignment(e, 'center')}} className={`${styles.blockStyleButton} simuicon-aligncenter`} />
				</Tooltip>
				<Tooltip overlayClassName={styles.tooltip} placement="top" title="右对齐">
					<span onMouseDown={(e) => {this.handleChangeTextAlignment(e, 'right')}} className={`${styles.blockStyleButton} simuicon-alignright`} />
				</Tooltip>
			</div>
		)
	},
	renderEditVideoModal() {
		return (
			<Modal maskClosable={false} title="视频上传" visible={this.state.showEditVideoModal} onCancel={this.handleEditVideoCancel} wrapClassName={styles.videoModalWrap}
				footer={[
					<div style = {{ textAlign:'left' }} key="video-foot" >
						<Button className={styles.cancelBtn} type="ghost" key="video-cancel" onClick={this.handleEditVideoCancel}>
							<span>取消</span>
						</Button>
						<Button className = {styles.okBtn} type = "primary" key = "video-ok" onClick = {this.handleEditVideoCommit} disabled={!!this.state.uploadId}>
							<span>确定</span>
						</Button>
					</div>]}
			>
				<div>
					<div className={classNames(styles.Progress, this.state.isVideoUploadFailure?styles.failureProgressBar:null)}><Progress percent={parseFloat(this.state.videoProgress.toFixed(1))} strokeWidth={5}/></div>

					{this.state.isVideoUploadFailure?<div className={styles.uploadVedioFailureTips}>网络错误，<span onClick={this.handleEditVideoCommit}>继续上传</span></div>:null}
				</div>
			</Modal>
		)
	},
	renderColorButton(){
		// 颜色面板
		const content = (
			<Row type="flex">
				{INLINE_STYLES.colors.map((color) =>
					(<Col className={styles.colorBlock} span={6} key={color.label}>
						<InlineColorButton
							label={color.label}
							onChange={this.props.onChange}
							editorState={this.props.editorState}
							style={color.style}
							afterToggle={this.handleFadeOut}
						/>
					</Col>)
				)}
			</Row>
		)

		return (
			<div className={styles.popoverStyle}>
				<div>
					<Tooltip ref="colorBoardTooltip" overlayClassName={styles.tooltip} placement="top" title="字体颜色">
						<span onMouseDown={this.handleFadeIn} className={styles.blockStyleButton}>
							<ColorPickerIcon editorState={this.props.editorState} />
						</span>
					</Tooltip>
					<div onMouseDown={this.handleContentMouseDown} ref="colorBoard" style={{ 'display':'none' }} className={styles.colorBoard}>
						{content}
					</div>
				</div>
			</div>
		)
	},

	renderLinkButton(){
		const activeIconClassName = this.state.showLinkPanel ? styles.activeLinkIcon : ''

		return (
			<div className={styles.linkGroup}>
				{this.state.showLinkPanel?<div className={styles.linkOverlay} />:null}
				<Tooltip ref="linkTooltip" overlayClassName={styles.tooltip} placement="top" title="添加链接">
					<span onMouseDown={this.handleClickLinkButton} className={`${styles.blockStyleButton} simuicon-link ${activeIconClassName}`} />
				</Tooltip>
				{this.state.showLinkPanel?<Input ref="linkInput" placeholder="为之前选中内容添加超链接" className={styles.linkInput} onBlur={() => this.setState({ showLinkPanel: false })} onKeyPress={this.handleAddLinkByEnter} />:null}
				{this.state.showLinkPanel?<Icon type="check-circle" onMouseDown={this.handleAddLink}/>:null}
			</div>
		)
	},
	renderPhotoAddButton(){
		const iconClassName ={
			[styles.blockStyleButton]: true,
			'simuicon-photo': true,
		}

		return (
			<Tooltip overlayClassName={styles.tooltip} placement="top" title="插入图片">
				{
						this.props.isMarkDownMode ?
							<div className={styles.photoAddStyle} onMouseDown={this.handleClickPhotoButton}>
								<span className={classNames(iconClassName)} />
							</div>
							:
							<div className={styles.photoAddStyle}>
								<input className={styles.invisibleInput} type="file" accept="image/jpg,image/jpeg,image/png" onChange={this.handlePhotoSelected}/>
								<span className={classNames(iconClassName)} />
							</div>
					}
			</Tooltip>
		)
	},
	renderVideoAddButton() {
		const iconClassName ={
			[styles.blockStyleButton]: true,
			'simuicon-video': true,
		}

		return (
			<Tooltip overlayClassName={styles.tooltip} placement="top" title="插入视频">
				{
					!this.props.isMarkDownMode ? (
						<div className={styles.videoAddStyle}>
							<input className={styles.invisibleInput} type="file" accept="video/mp4,video/x-m4v,video/*" onChange={this.handleVideoSelected}/>
							<span className={classNames(iconClassName)} />
						</div>
					) : (
						<div className={styles.videoAddStyle}>
							<span className={classNames(iconClassName)} onMouseDown={this.handleClickVideoButton} />
						</div>
					)
				}
			</Tooltip>
		)
	},
	renderTableAddButton(){
		const iconClassName ={
			[styles.blockStyleButton]: true,
			'simuicon-table': true,
		}

		return (
			<div className={styles.wrapTableAddStyel} onMouseDown={(e) => {e.stopPropagation()}}>
				<Tooltip ref="tableBoardTooltip" overlayClassName={styles.tooltip} placement="top" title="插入表格">
					<div className={styles.tableAddStyle} onMouseDown={this.handleClickTableButton}>
						<span className={classNames(iconClassName)} />
					</div>
				</Tooltip>
				<div ref="tableBoard" style={{ 'display':'none' }} className={styles.tableBoard} >
					<TableModal onOK={this.createTable}/>
				</div>
			</div>
		)
	},
	render() {
		const {
			editorState,
			onChange,
			onEnterFullscreen,
			isFullscreenMode,
			isMarkDownMode,
			onChangeMarkDownMode,
			liveEdits,
		} = this.props

		return (
			<div className={classNames(styles.container, isFullscreenMode?styles['container-fullscreen']:null)}>
				{this.renderEditVideoModal()}

				<div className={styles.content}>
					<div className={styles.leftGroup}>
						{/* headline */}
						<div className={styles.headlineGroup}>
							<BlockStyleButton onChange={onChange} type={BLOCK_TYPES.h1} editorState={editorState} isMarkDownMode={isMarkDownMode}/>
							<BlockStyleButton onChange={onChange} type={BLOCK_TYPES.h2} editorState={editorState} isMarkDownMode={isMarkDownMode}/>
							<BlockStyleButton onChange={onChange} type={BLOCK_TYPES.h3} editorState={editorState} isMarkDownMode={isMarkDownMode}/>
						</div>

						{/* text decoration style */}
						<div className={styles.textDecorationGroup}>
							<InlineStyleButton enable={!liveEdits.count()} onChange={onChange} type={INLINE_STYLES.bold} editorState={editorState} isMarkDownMode={isMarkDownMode}/>
							<InlineStyleButton enable={!liveEdits.count()} onChange={onChange} type={INLINE_STYLES.italic} editorState={editorState} isMarkDownMode={isMarkDownMode}/>
							{isMarkDownMode ? null : this.renderColorButton()}
							<BlockStyleButton onChange={onChange} type={BLOCK_TYPES.blockquote} editorState={editorState} isMarkDownMode={isMarkDownMode}/>
							<BlockStyleButton onChange={onChange} type={BLOCK_TYPES.code} editorState={editorState} isMarkDownMode={isMarkDownMode}/>
						</div>


						{/* text alignment style */}
						{isMarkDownMode ? null : this.renderTextAlignGroup()}

						<div className={styles.functionGroup}>
							{this.renderLinkButton()}
							{this.renderPhotoAddButton()}
							{this.renderVideoAddButton()}
							{this.renderTableAddButton()}
						</div>
					</div>

					<div className={styles.rightGroup}>
						{isFullscreenMode?<div className={styles.markdown} onClick={() => onChangeMarkDownMode(!isMarkDownMode)}>{isMarkDownMode?'写作模式':'MarkDown'}</div>:null}
						{/*全屏模式开关*/}
						{isFullscreenMode?null:<span onClick={onEnterFullscreen} className={`simuicon-zoomout ${styles.fullscreen}`} />}
					</div>
				</div>


			</div>
		)
	}
})

function mapStateToProps(state) {
	return {
		// user: state.get('user'),
	}
}

function mapDispatchToProps() {
	return {}
}

export default connect(mapStateToProps, mapDispatchToProps)(EditorControl)
