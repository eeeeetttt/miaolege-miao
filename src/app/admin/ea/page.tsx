'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  Plus,
  Edit,
  Trash2,
  FileCode,
  Check,
  AlertTriangle,
  Package,
} from 'lucide-react';

interface EaProduct {
  id: number;
  name: string;
  description: string | null;
  price: number;
  version: string | null;
  platform: string | null;
  category: string | null;
  features: string | null;
  downloadUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  status: string | null;
  salesCount: number | null;
  createdAt: Date | null;
}

export default function EaManagePage() {
  const [products, setProducts] = useState<EaProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<EaProduct | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadProductIdRef = useRef<number | null>(null);

  // 产品类型配置
  const productTypes = [
    { value: 'ea', label: 'EA智能交易' },
    { value: 'indicator', label: '技术指标' },
    { value: 'script', label: '脚本工具' },
    { value: 'tool', label: '交易工具' },
  ];

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '0',
    version: '1.0.0',
    platform: 'Both',
    category: '',
    features: '',
    productType: 'ea', // 新增产品类型
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/ea/manage');
      const data = await res.json();
      if (res.ok) {
        setProducts(data.products || []);
      } else {
        setError(data.error || '获取产品列表失败');
      }
    } catch (err) {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (productId: number) => {
    uploadProductIdRef.current = productId;
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const productId = uploadProductIdRef.current;

    if (!file || !productId) return;

    setUploading(productId);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('productId', productId.toString());

      const res = await fetch('/api/ea/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(`${file.name} 上传成功！`);
        // 更新产品列表
        setProducts(prev =>
          prev.map(p =>
            p.id === productId
              ? { ...p, downloadUrl: data.fileKey, fileName: data.fileName, fileSize: data.fileSize }
              : p
          )
        );
      } else {
        setError(data.error || '上传失败');
      }
    } catch (err) {
      setError('上传失败');
    } finally {
      setUploading(null);
      // 重置文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveProduct = async () => {
    if (!formData.name || !formData.price) {
      setError('请填写产品名称和价格');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const features = formData.features
        .split('\n')
        .map(f => f.trim())
        .filter(f => f);

      const body = {
        ...formData,
        price: parseInt(formData.price),
        features: JSON.stringify(features),
        productId: editingProduct?.id,
      };

      const res = await fetch('/api/ea/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(editingProduct ? '产品更新成功' : '产品创建成功');
        setDialogOpen(false);
        resetForm();
        fetchProducts();
      } else {
        setError(data.error || '操作失败');
      }
    } catch (err) {
      setError('网络错误');
    } finally {
      setSaving(false);
    }
  };

  const handleEditProduct = (product: EaProduct) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      version: product.version || '1.0.0',
      platform: product.platform || 'Both',
      category: product.category || '',
      features: product.features ? JSON.parse(product.features).join('\n') : '',
      productType: (product as any).productType || 'ea',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      price: '0',
      version: '1.0.0',
      platform: 'Both',
      category: '',
      features: '',
      productType: 'ea',
    });
  };

  const formatFileSize = (kb: number | null) => {
    if (!kb) return '-';
    if (kb < 1024) return `${kb} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Spinner className="w-8 h-8" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-900 dark:to-slate-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">EA产品管理</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              管理EA产品信息，上传EA文件
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                添加产品
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingProduct ? '编辑产品' : '添加新产品'}</DialogTitle>
                <DialogDescription>
                  填写产品信息，保存后可上传EA文件
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>产品名称 *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="如：趋势追踪大师"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>产品类型 *</Label>
                    <Select value={formData.productType} onValueChange={(v) => setFormData({ ...formData, productType: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {productTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>价格（U）*</Label>
                    <Input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>产品描述</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="详细描述产品特点..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>平台</Label>
                    <Select value={formData.platform} onValueChange={(v) => setFormData({ ...formData, platform: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MT4">MT4</SelectItem>
                        <SelectItem value="MT5">MT5</SelectItem>
                        <SelectItem value="Both">MT4/MT5</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>版本号</Label>
                    <Input
                      value={formData.version}
                      onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>分类</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择分类" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="趋势">趋势</SelectItem>
                        <SelectItem value="震荡">震荡</SelectItem>
                        <SelectItem value="马丁">马丁</SelectItem>
                        <SelectItem value="剥头皮">剥头皮</SelectItem>
                        <SelectItem value="其他">其他</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>功能特点（每行一个）</Label>
                  <Textarea
                    value={formData.features}
                    onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                    placeholder="多周期趋势确认&#10;动态止损止盈&#10;智能仓位管理"
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleSaveProduct} disabled={saving}>
                  {saving ? <Spinner className="w-4 h-4" /> : '保存'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* 提示信息 */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-6 border-green-500 text-green-700 dark:text-green-400">
            <Check className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".ex4,.ex5,.mq4,.mq5"
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* 产品列表 */}
        <div className="grid gap-4">
          {products.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>暂无产品，点击上方按钮添加</p>
              </CardContent>
            </Card>
          ) : (
            products.map((product) => {
              const productType = (product as any).productType || 'ea';
              const typeLabel = productTypes.find(t => t.value === productType)?.label || 'EA智能交易';
              const typeColor = productType === 'ea' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                               productType === 'indicator' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                               productType === 'script' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                               'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
              
              return (
              <Card key={product.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-semibold">{product.name}</h3>
                        <Badge className={typeColor}>{typeLabel}</Badge>
                        <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                          {product.status === 'active' ? '上架中' : '已下架'}
                        </Badge>
                        <Badge variant="outline">v{product.version || '1.0.0'}</Badge>
                        <Badge variant="outline">{product.platform || 'Both'}</Badge>
                      </div>
                      
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                        {product.description || '暂无描述'}
                      </p>

                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <span>价格: <strong className="text-purple-600">{product.price}</strong> U</span>
                        <span>销量: {product.salesCount || 0}</span>
                        <span>分类: {product.category || '-'}</span>
                      </div>

                      {/* 文件信息 */}
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileCode className="w-5 h-5 text-gray-400" />
                            {product.fileName ? (
                              <div>
                                <span className="text-sm font-medium">{product.fileName}</span>
                                <span className="text-xs text-gray-500 ml-2">
                                  ({formatFileSize(product.fileSize)})
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">未上传文件</span>
                            )}
                          </div>

                          <Button
                            size="sm"
                            variant={product.fileName ? 'outline' : 'default'}
                            onClick={() => handleFileSelect(product.id)}
                            disabled={uploading === product.id}
                          >
                            {uploading === product.id ? (
                              <Spinner className="w-4 h-4" />
                            ) : (
                              <>
                                <Upload className="w-4 h-4 mr-1" />
                                {product.fileName ? '更新文件' : '上传文件'}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button size="sm" variant="outline" onClick={() => handleEditProduct(product)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
            }))
          }))))))
        </div>
      </div>
    </div>
  );
}
