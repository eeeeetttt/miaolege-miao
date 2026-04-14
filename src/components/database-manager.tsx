'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Database,
  Table2,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  X,
  Check,
  AlertCircle,
  Info,
  Code,
  Eye,
  EyeOff,
  Copy,
} from 'lucide-react';

interface TableInfo {
  name: string;
  count: number;
}

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

interface TableData {
  [key: string]: any;
}

export function DatabaseManager() {
  // 状态
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTable, setCurrentTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<TableData[]>([]);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');

  // 编辑相关
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<TableData | null>(null);
  const [editForm, setEditForm] = useState<TableData>({});
  const [saving, setSaving] = useState(false);

  // 添加相关
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState<TableData>({});
  const [addSaving, setAddSaving] = useState(false);

  // 删除相关
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteRecord, setDeleteRecord] = useState<TableData | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 批量删除
  const [selectedIds, setSelectedIds] = useState<Set<any>>(new Set());
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);

  // SQL执行
  const [sqlDialogOpen, setSqlDialogOpen] = useState(false);
  const [sqlQuery, setSqlQuery] = useState('');
  const [sqlResult, setSqlResult] = useState<any>(null);
  const [sqlError, setSqlError] = useState('');
  const [sqlExecuting, setSqlExecuting] = useState(false);

  // 提示
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // 加载表列表
  const loadTables = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/database');
      const data = await res.json();
      if (data.success) {
        setTables(data.tables);
      } else {
        setError(data.error || '加载表列表失败');
      }
    } catch (err) {
      console.error('Load tables error:', err);
      setError('加载表列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载表数据
  const loadTableData = async (tableName: string, page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        table: tableName,
        page: page.toString(),
        pageSize: pagination.pageSize.toString(),
        sortField,
        sortOrder,
      });
      
      const res = await fetch(`/api/admin/database?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setTableData(data.data);
        setColumns(data.columns);
        setPagination(data.pagination);
        setSelectedIds(new Set());
      } else {
        setError(data.error || '加载数据失败');
      }
    } catch (err) {
      console.error('Load table data error:', err);
      setError('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, []);

  useEffect(() => {
    if (currentTable) {
      loadTableData(currentTable);
    }
  }, [currentTable, pagination.page, sortField, sortOrder]);

  // 处理排序
  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setPagination(p => ({ ...p, page: 1 }));
  };

  // 打开编辑对话框
  const handleEdit = (record: TableData) => {
    setEditRecord(record);
    setEditForm({ ...record });
    setEditDialogOpen(true);
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editRecord?.id) {
      setError('缺少记录ID');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          table: currentTable,
          id: editRecord.id,
          data: editForm,
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        setSuccess('更新成功');
        setEditDialogOpen(false);
        loadTableData(currentTable!);
      } else {
        setError(data.error || '更新失败');
      }
    } catch (err) {
      setError('更新失败');
    } finally {
      setSaving(false);
    }
  };

  // 打开添加对话框
  const handleAdd = () => {
    const defaultForm: TableData = {};
    columns.forEach(col => {
      if (col.column_default) {
        defaultForm[col.column_name] = col.column_default;
      }
    });
    setAddForm(defaultForm);
    setAddDialogOpen(true);
  };

  // 保存添加
  const handleSaveAdd = async () => {
    setAddSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'insert',
          table: currentTable,
          data: addForm,
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        setSuccess('添加成功');
        setAddDialogOpen(false);
        loadTableData(currentTable!);
        loadTables();
      } else {
        setError(data.error || '添加失败');
      }
    } catch (err) {
      setError('添加失败');
    } finally {
      setAddSaving(false);
    }
  };

  // 打开删除对话框
  const handleDelete = (record: TableData) => {
    setDeleteRecord(record);
    setDeleteDialogOpen(true);
  };

  // 确认删除
  const handleConfirmDelete = async () => {
    if (!deleteRecord?.id) {
      setError('缺少记录ID');
      setDeleting(false);
      return;
    }
    setDeleting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          table: currentTable,
          id: deleteRecord.id,
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        setSuccess('删除成功');
        setDeleteDialogOpen(false);
        loadTableData(currentTable!);
        loadTables();
      } else {
        setError(data.error || '删除失败');
      }
    } catch (err) {
      setError('删除失败');
    } finally {
      setDeleting(false);
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    setBatchDeleting(true);
    setError('');
    try {
      const res = await fetch('/api/admin/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'batch_delete',
          table: currentTable,
          ids: Array.from(selectedIds),
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        setSuccess(data.message || '删除成功');
        setBatchDeleteDialogOpen(false);
        setSelectedIds(new Set());
        loadTableData(currentTable!);
        loadTables();
      } else {
        setError(data.error || '删除失败');
      }
    } catch (err) {
      setError('删除失败');
    } finally {
      setBatchDeleting(false);
    }
  };

  // 执行SQL
  const handleExecuteSql = async () => {
    setSqlExecuting(true);
    setSqlError('');
    setSqlResult(null);
    try {
      const res = await fetch('/api/admin/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute_sql',
          table: currentTable,
          data: { sql: sqlQuery },
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        setSqlResult(data.data);
        setSuccess('SQL执行成功');
      } else {
        setSqlError(data.error || 'SQL执行失败');
      }
    } catch (err) {
      setSqlError('SQL执行失败');
    } finally {
      setSqlExecuting(false);
    }
  };

  // 切换选择
  const toggleSelect = (id: any) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // 复制到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('已复制到剪贴板');
  };

  // 格式化单元格值
  const formatCellValue = (value: any, column: ColumnInfo): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? '是' : '否';
    if (value instanceof Date) return value.toLocaleString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  // 判断是否为只读字段
  const isReadOnlyField = (columnName: string): boolean => {
    const readonlyFields = ['id', 'created_at', 'updated_at'];
    return readonlyFields.includes(columnName);
  };

  return (
    <div className="space-y-4">
      {/* 成功/错误提示 */}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* 左侧：表列表 */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="w-5 h-5" />
              数据表
            </CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={loadTables} className="flex-1">
                <RefreshCw className="w-4 h-4 mr-1" />
                刷新
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSqlDialogOpen(true)} className="flex-1">
                <Code className="w-4 h-4 mr-1" />
                SQL
              </Button>
            </div>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto">
            {loading && tables.length === 0 ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : (
              <div className="space-y-1">
                {tables.map(table => (
                  <button
                    key={table.name}
                    onClick={() => {
                      setCurrentTable(table.name);
                      setPagination(p => ({ ...p, page: 1 }));
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                      currentTable === table.name
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Table2 className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate text-sm">{table.name}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">{table.count}</Badge>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 右侧：表数据 */}
        <Card className="lg:col-span-3">
          {currentTable ? (
            <>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Table2 className="w-5 h-5" />
                    {currentTable}
                    <Badge variant="outline">{pagination.total} 条记录</Badge>
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAdd} className="bg-green-600 hover:bg-green-700">
                      <Plus className="w-4 h-4 mr-1" />
                      添加
                    </Button>
                    {selectedIds.size > 0 && (
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => setBatchDeleteDialogOpen(true)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        删除 ({selectedIds.size})
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => loadTableData(currentTable)}>
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Spinner />
                  </div>
                ) : (
                  <>
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10">
                              <Checkbox
                                checked={selectedIds.size === tableData.length && tableData.length > 0}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedIds(new Set(tableData.map(r => r.id)));
                                  } else {
                                    setSelectedIds(new Set());
                                  }
                                }}
                              />
                            </TableHead>
                            {columns.map(col => (
                              <TableHead 
                                key={col.column_name}
                                className="cursor-pointer hover:bg-gray-50"
                                onClick={() => handleSort(col.column_name)}
                              >
                                <div className="flex items-center gap-1">
                                  <span>{col.column_name}</span>
                                  <span className="text-xs text-gray-400">({col.data_type})</span>
                                  {sortField === col.column_name && (
                                    sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                                  )}
                                </div>
                              </TableHead>
                            ))}
                            <TableHead className="w-24">操作</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tableData.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={columns.length + 2} className="text-center py-8 text-gray-500">
                                暂无数据
                              </TableCell>
                            </TableRow>
                          ) : (
                            tableData.map((row, index) => (
                              <TableRow key={row.id || index} className={selectedIds.has(row.id) ? 'bg-purple-50' : ''}>
                                <TableCell>
                                  <Checkbox
                                    checked={selectedIds.has(row.id)}
                                    onCheckedChange={() => toggleSelect(row.id)}
                                  />
                                </TableCell>
                                {columns.map(col => (
                                  <TableCell 
                                    key={col.column_name}
                                    className="max-w-[200px] truncate"
                                    title={formatCellValue(row[col.column_name], col)}
                                  >
                                    {formatCellValue(row[col.column_name], col)}
                                  </TableCell>
                                ))}
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Button size="sm" variant="ghost" onClick={() => handleEdit(row)}>
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleDelete(row)}>
                                      <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* 分页 */}
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-gray-500">
                        显示 {(pagination.page - 1) * pagination.pageSize + 1} - {Math.min(pagination.page * pagination.pageSize, pagination.total)} 条，共 {pagination.total} 条
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pagination.page <= 1}
                          onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm">
                          第 {pagination.page} / {pagination.totalPages || 1} 页
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pagination.page >= pagination.totalPages}
                          onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="py-12 text-center text-gray-500">
              <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>请从左侧选择一个数据表</p>
            </CardContent>
          )}
        </Card>
      </div>

      {/* 编辑对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑记录</DialogTitle>
            <DialogDescription>修改 {currentTable} 表中的记录</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {columns.map(col => (
              <div key={col.column_name} className="space-y-1">
                <Label className="flex items-center gap-2">
                  {col.column_name}
                  <span className="text-xs text-gray-400">({col.data_type})</span>
                  {col.is_nullable === 'YES' && <span className="text-xs text-gray-400">可空</span>}
                </Label>
                <Input
                  value={editForm[col.column_name] ?? ''}
                  onChange={e => setEditForm(f => ({ ...f, [col.column_name]: e.target.value }))}
                  disabled={isReadOnlyField(col.column_name)}
                  placeholder={col.column_default || ''}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>取消</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? <Spinner className="w-4 h-4 mr-1" /> : <Check className="w-4 h-4 mr-1" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加对话框 */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>添加记录</DialogTitle>
            <DialogDescription>向 {currentTable} 表中添加新记录</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {columns.filter(col => !isReadOnlyField(col.column_name)).map(col => (
              <div key={col.column_name} className="space-y-1">
                <Label className="flex items-center gap-2">
                  {col.column_name}
                  <span className="text-xs text-gray-400">({col.data_type})</span>
                  {col.is_nullable === 'YES' && <span className="text-xs text-gray-400">可空</span>}
                </Label>
                <Input
                  value={addForm[col.column_name] ?? ''}
                  onChange={e => setAddForm(f => ({ ...f, [col.column_name]: e.target.value }))}
                  placeholder={col.column_default || ''}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>取消</Button>
            <Button onClick={handleSaveAdd} disabled={addSaving}>
              {addSaving ? <Spinner className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除这条记录吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleting}>
              {deleting ? <Spinner className="w-4 h-4 mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量删除确认对话框 */}
      <Dialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认批量删除</DialogTitle>
            <DialogDescription>
              确定要删除选中的 {selectedIds.size} 条记录吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchDeleteDialogOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={handleBatchDelete} disabled={batchDeleting}>
              {batchDeleting ? <Spinner className="w-4 h-4 mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
              删除 {selectedIds.size} 条
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SQL执行对话框 */}
      <Dialog open={sqlDialogOpen} onOpenChange={setSqlDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>执行 SQL</DialogTitle>
            <DialogDescription>
              执行自定义 SQL 查询（仅支持 SELECT/INSERT/UPDATE/DELETE）
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>SQL 语句</Label>
              <textarea
                value={sqlQuery}
                onChange={e => setSqlQuery(e.target.value)}
                className="w-full h-32 p-2 border rounded-md font-mono text-sm"
                placeholder="SELECT * FROM table_name LIMIT 10;"
              />
            </div>
            <Button onClick={handleExecuteSql} disabled={sqlExecuting || !sqlQuery.trim()}>
              {sqlExecuting ? <Spinner className="w-4 h-4 mr-1" /> : <Code className="w-4 h-4 mr-1" />}
              执行
            </Button>
            
            {sqlError && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">{sqlError}</AlertDescription>
              </Alert>
            )}
            
            {sqlResult && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>查询结果</Label>
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(JSON.stringify(sqlResult, null, 2))}>
                    <Copy className="w-4 h-4 mr-1" />
                    复制
                  </Button>
                </div>
                <div className="max-h-64 overflow-auto rounded border bg-gray-50 dark:bg-gray-900 p-2">
                  <pre className="text-xs">{JSON.stringify(sqlResult, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSqlDialogOpen(false); setSqlQuery(''); setSqlResult(null); setSqlError(''); }}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 辅助组件
function CheckCircle(props: any) {
  return <Check className={props.className} />;
}
