const _ = require('lodash')
const fromJS = require('immutable').fromJS

// 生成 content block 的 key
const MULTIPLIER = Math.pow(2, 24)
const generateRandomKey = () => {
	return Math.floor(Math.random() * MULTIPLIER).toString(32)
}

const getModifyActions = (data) => {
	const baseRawDraftContent = fromJS(data.baseRawDraftContent)
	const deltas = data.delta

	return _.map(deltas, delta => {
		return {
			delete: _.map(delta.delete, del => baseRawDraftContent.getIn(['blocks', del]).get('key')),
			replace: _.map(delta.replace, rep => {
				const key = baseRawDraftContent.getIn(['blocks', rep.position]).get('key')
				return {
					position: key,
					newContent: rep.newContent,
				}
			}),
			insert: _.map(delta.insert, ins => {
				if (ins.position < baseRawDraftContent.get('blocks').size) {
					const key = baseRawDraftContent.getIn(['blocks', ins.position]).get('key')
					return {
						position: key,
						content: ins.content,
					}
				} else {
					return {
						content: ins.content,
					}
				}
			}),
		}
	})
}

const parse = (base, actions) => {
	let newContentState = base

	// delete actions
	const deleteActions = actions.delete || []
	newContentState = newContentState
		.update('blocks', blocks => blocks.filter(block => !~deleteActions.indexOf(block.get('key'))))

	// insert actions
	const insertActions = actions.insert || []
	_.each(insertActions, insertAction => {
		newContentState = newContentState
			.update('blocks', blocks => {
				const insertPosition = insertAction.position ? blocks.findIndex(v => v.get('key') === insertAction.position) : blocks.size
				return blocks.splice(insertPosition, 0, ..._.map(insertAction.contents, v => fromJS(v)))
			})
	})

	// replacement actions
	const replacementActions = actions.replace || []
	_.each(replacementActions, replacementAction => {
		newContentState = newContentState.update('blocks', blocks => blocks.set(blocks.findIndex(v => v.get('key') === replacementAction.position), fromJS(replacementAction.newContent)))
	})

	return newContentState
}

const [EQUAL, INS, DEL, SUB] = [0, 1, 2, 3]
const med = (M, N, isEqual) => {
	// Intialize table and back trace table.
	const table = new Array(M.length + 1)
	const backtrace = new Array(M.length + 1)

	for (let i = 0; i < M.length + 1; i++) {
		table[i] = new Array(N.length)
		backtrace[i] = new Array(N.length)
	}

	_.each(_.range(0, M.length + 1), v => table[v][0] = v)
	_.each(_.range(0, N.length + 1), v => table[0][v] = v)

	for (let i = 1; i <= M.length; i++) {
		for (let j = 1; j <= N.length; j++) {
			table[i][j] = Math.min(table[i - 1][j] + 1, table[i][j - 1] + 1, table[i - 1][j - 1] + (isEqual(M[i - 1], N[j - 1]) ? 0 : 2))

			// Adding results to backtrace table.
			if (table[i][j] === table[i - 1][j - 1] + 2 && !isEqual(M[i - 1], N[j - 1])) {
				backtrace[i][j] = SUB
			} else if (table[i][j] === table[i - 1][j - 1] && isEqual(M[i - 1], N[j - 1])) {
				backtrace[i][j] = EQUAL
			} else if (table[i][j] === table[i][j - 1] + 1) {
				backtrace[i][j] = INS
			} else if (table[i][j] === table[i - 1][j] + 1) {
				backtrace[i][j] = DEL
			}
		}
	}

	let i = M.length
	let j = N.length
	const m = []
	const n = []
	while (i >= 1 && j >= 1) {
		switch (backtrace[i][j]) {
			case EQUAL:
			case SUB:
				m.unshift(M[i - 1])
				n.unshift(N[j - 1])
				i--
				j--
				break
			case DEL:
				n.unshift('*')
				m.unshift(M[i - 1])
				i--
				break
			case INS:
				n.unshift(N[j - 1])
				m.unshift('*')
				j--
				break
			default:
				break
		}
	}
	while (i) {
		m.unshift(M[i - 1])
		n.unshift('*')
		i--
	}
	while (j) {
		n.unshift(N[j - 1])
		m.unshift('*')
		j--
	}

	return [m, n]
}

// Compare two blocks
const isBlockEqual = (A, B) => {
	return A.key && B.key && A.key === B.key ? _.isEqual(A, B) : false;
}

const generateDelta = (m, n, isEqual = isBlockEqual) => {
	const [M, N] = med(m, n, isEqual)
	const delta = {
		delete: [],
		insert: [],
		replace: [],
	}

	let cursor = 0
	for (let i = 0; i < M.length; i++) {
		const content = []
		if (M[i] === "*") {
			// Insert delta.
			while (M[i + 1] === "*") {
				content.push(N[i])
				i++
			}
			content.push(N[i])
			delta.insert.push({
				position: cursor,
				content,
			})
		} else if (N[i] === "*") {
			// Delete delta.
			cursor++
			delta.delete.push(cursor)
		} else if (!isEqual(N[i], M[i])) {
			// Replace delta.
			cursor++
			delta.replace.push({
				position: cursor,
				content: N[i],
			})
		} else {
			// Equal element.
			cursor++
		}
	}

	return delta
}

export default {
	generateDelta,
	generateRandomKey,
	getModifyActions,
	med,
	parse,
}
