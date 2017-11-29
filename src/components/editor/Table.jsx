import React from 'react'
import createReactClass from 'create-react-class'
import { Entity } from 'draft-js'
import _ from 'lodash'
import { fromJS } from 'immutable'
import { Input } from 'antd'
import styles from './Table.scss'

const { TextArea } = Input

const Table = createReactClass({
	componentWillMount(){
		this.setState({
			tableData: fromJS(this.props.blockProps.tableData)
		})
	},

	componentWillReceiveProps(nextProps){
		this.setState({
			tableData: fromJS(nextProps.blockProps.tableData)
		})
	},

	handleGridChange(row, col, e){
		if (this.props.blockProps.isEditable) {
			const tableData = fromJS(this.state.tableData).setIn([row, col], e.target.value)
			this.setState({
				tableData
			})
		}
	},

	handleGridBlur(){
		const entityKey = this.props.block.getEntityAt(0)

		Entity.mergeData(
			entityKey,
			{ data:this.state.tableData.toJS() }
		)
		this.props.blockProps.onFinishEdit(this.props.block.getKey())
	},

	// Render
	renderGrid(row, col) {
		const {
			onStartEdit,
		} = this.props.blockProps

		const blockKey = this.props.block.getKey()

		return (
			<td key={col} className={styles.grid}>
				{/* <Input
					disabled={!this.props.blockProps.isEditable}
					style={{ fontWeight: row ? 'normal' : 'bold' }}
					onChange={(e) => {this.handleGridChange(row, col, e)}}
					value={this.state.tableData.getIn([row, col])}
					onFocus={() => {onStartEdit(blockKey)}}
					onBlur={this.handleGridBlur}
					type="textarea"
					autosize
				/> */}
				<TextArea
					disabled={!this.props.blockProps.isEditable}
					style={{ fontWeight: row ? 'normal' : 'bold' }}
					onChange={(e) => {this.handleGridChange(row, col, e)}}
					value={this.state.tableData.getIn([row, col])}
					onFocus={() => {onStartEdit(blockKey)}}
					onBlur={this.handleGridBlur}
					autosize={{minRows: 1, maxRows: 99}}
				/>
			</td>
		)
	},
	render() {
		const entity = Entity.get(this.props.block.getEntityAt(0))

		const {
			columnCount,
			rowCount,
		} = entity.getData()
		const entityData = this.state.tableData
		return (
			<table className={styles.container}>
				<tbody>
					{
						_.map(_.range(rowCount), (row) => (
							<tr key={row}>
								{
									_.map(_.range(columnCount), (column) => this.renderGrid(row, column, entityData))
								}
							</tr>
						))
					}
				</tbody>
			</table>
		)
	}
})

export default Table
