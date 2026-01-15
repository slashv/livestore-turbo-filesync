import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { tables } from '@repo/schema'
import { createTodoActions, visibleTodosQuery, type Filter, type Todo } from '@repo/ui'
import { filterTodos, countActiveTodos, hasCompletedTodos } from '@repo/ui'
import { useAppStore } from '~/livestore/store'

export function TodoApp() {
  const store = useAppStore()
  const [inputText, setInputText] = useState('')

  // Reactive queries using LiveStore
  const todos = store.useQuery(visibleTodosQuery)
  const uiState = store.useQuery(tables.uiState.get())

  const actions = createTodoActions(store)
  const filteredTodos = filterTodos(todos, uiState.filter)
  const activeCount = countActiveTodos(todos)
  const hasCompleted = hasCompletedTodos(todos)

  const handleSubmit = () => {
    if (inputText.trim()) {
      actions.addTodo(inputText)
      setInputText('')
    }
  }

  const renderTodo = ({ item }: { item: Todo }) => (
    <View style={styles.todoItem}>
      <TouchableOpacity
        style={[styles.checkbox, item.completed && styles.checkboxChecked]}
        onPress={() => actions.toggleTodo(item.id, item.completed)}
      >
        {item.completed && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
      <Text style={[styles.todoText, item.completed && styles.todoTextCompleted]}>{item.text}</Text>
      <TouchableOpacity style={styles.deleteButton} onPress={() => actions.deleteTodo(item.id)}>
        <Text style={styles.deleteText}>×</Text>
      </TouchableOpacity>
    </View>
  )

  const filters: Filter[] = ['all', 'active', 'completed']

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Text style={styles.title}>todos</Text>

      <View style={styles.card}>
        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="What needs to be done?"
            placeholderTextColor="#999"
            onSubmitEditing={handleSubmit}
            returnKeyType="done"
          />
        </View>

        {/* List */}
        <FlatList
          data={filteredTodos}
          renderItem={renderTodo}
          keyExtractor={(item) => item.id}
          style={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No todos yet</Text>
            </View>
          }
        />

        {/* Footer */}
        {todos.length > 0 && (
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {activeCount} {activeCount === 1 ? 'item' : 'items'} left
            </Text>

            <View style={styles.filters}>
              {filters.map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[styles.filterButton, uiState.filter === filter && styles.filterButtonActive]}
                  onPress={() => actions.setFilter(filter)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      uiState.filter === filter && styles.filterTextActive,
                    ]}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {hasCompleted && (
              <TouchableOpacity onPress={actions.clearCompleted}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <Text style={styles.info}>Synced with LiveStore</Text>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: '100',
    color: '#b83f45',
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    flex: 1,
    maxHeight: '70%',
  },
  inputContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  input: {
    padding: 16,
    fontSize: 18,
    color: '#333',
  },
  list: {
    flex: 1,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#5dc2af',
    borderColor: '#5dc2af',
  },
  checkmark: {
    color: '#fff',
    fontWeight: 'bold',
  },
  todoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 18,
    color: '#333',
  },
  todoTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#aaa',
  },
  deleteButton: {
    padding: 8,
  },
  deleteText: {
    fontSize: 24,
    color: '#cc9a9a',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#fafafa',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  footerText: {
    color: '#777',
    fontSize: 12,
  },
  filters: {
    flexDirection: 'row',
    gap: 4,
  },
  filterButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterButtonActive: {
    borderColor: '#b83f45',
  },
  filterText: {
    fontSize: 12,
    color: '#777',
  },
  filterTextActive: {
    color: '#b83f45',
  },
  clearText: {
    color: '#777',
    fontSize: 12,
  },
  info: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
    fontSize: 12,
  },
})
