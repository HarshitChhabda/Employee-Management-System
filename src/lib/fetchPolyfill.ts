const originalFetch = window.fetch;

const getSession = () => {
  try {
    const authData = localStorage.getItem('auth-storage');
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed?.state?.session || null;
    }
  } catch (e) {
    console.error('Failed to get session from localStorage:', e);
  }
  return null;
};

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  let url = '';
  if (typeof input === 'string') {
    url = input;
  } else if (input instanceof URL) {
    url = input.href;
  } else {
    url = input.url;
  }

  // Handle IPC routes
  if (url.startsWith('/api/')) {
    const urlObj = new URL(url, 'http://localhost');
    const endpoint = urlObj.pathname;
    
    try {
      let result;
      // @ts-ignore
      const electronAPI = window.electronAPI;
      const session = getSession();

      if (!electronAPI) {
        console.warn('Electron API not found, returning mock/error response for /api route');
        return {
          ok: false,
          status: 503,
          statusText: 'Electron API Not Available',
          json: async () => ({ 
            error: 'Electron API not found. Please run this application in Electron.',
            counts: { totalEmployees: 0 },
            attendanceToday: { present: 0, absent: 0 },
            recentLetters: [],
            recentCategoryChanges: []
          }),
        } as Response;
      }

      const getBody = () => {
        if (!init?.body) return {};
        if (typeof init.body === 'string') return JSON.parse(init.body);
        return init.body;
      };

      if (endpoint === '/api/dashboard') {
        result = await electronAPI.invoke('api:dashboard', session);
      } else if (endpoint === '/api/employees') {
        const method = init?.method === 'POST' ? 'create' : init?.method === 'PUT' ? 'update' : init?.method === 'DELETE' ? 'delete' : 'get';
        const searchParams = new URL(url, 'http://localhost').searchParams;
        const id = searchParams.get('id');
        const isActive = searchParams.get('is_active');
        const search = searchParams.get('search');
        const category = searchParams.get('category');
        
        let reqData = getBody();
        if (method === 'get') {
           reqData = {};
           if (id) reqData.id = id;
           if (isActive !== null) reqData.is_active = isActive === 'true';
           if (search) reqData.search = search;
           if (category) reqData.category = category;
        }
        if (method === 'delete' && !reqData.id && id) {
          reqData.id = id;
        }
        
        result = await electronAPI.invoke('api:employees', method, reqData, session);
      } else if (endpoint === '/api/letters') {
        let method = 'get';
        if (init?.method === 'POST') method = 'create';
        else if (init?.method === 'PUT') method = 'update';
        else if (init?.method === 'DELETE') method = 'delete';
        result = await electronAPI.invoke('api:letters', method, getBody(), session);
      } else if (endpoint === '/api/resigned-employees') {
        let method = 'get';
        if (init?.method === 'POST') method = 'create';
        else if (init?.method === 'PUT') method = 'update';
        else if (init?.method === 'DELETE') method = 'delete';
        
        const searchParams = new URL(url, 'http://localhost').searchParams;
        const search = searchParams.get('search');
        
        let reqData = getBody();
        if (method === 'get') {
          reqData = {};
          if (search) reqData.search = search;
        }
        
        result = await electronAPI.invoke('api:resigned', method, reqData, session);
      } else if (endpoint === '/api/employee-history') {
        const searchParams = new URL(url, 'http://localhost').searchParams;
        const reqData: any = {
          employee_id: searchParams.get('employee_id'),
          action_type: searchParams.get('action'),
          from_date: searchParams.get('from'),
          to_date: searchParams.get('to'),
          search: searchParams.get('search'),
          limit: searchParams.get('limit'),
          offset: searchParams.get('offset')
        };
        result = await electronAPI.invoke('api:employee-history', 'get', reqData, session);
      } else if (endpoint === '/api/attendance/auto-fill-weekly-offs') {
        result = await electronAPI.invoke('api:attendance', 'auto-fill-weekly-offs', getBody(), session);
      } else if (endpoint === '/api/attendance') {
        const method = init?.method === 'POST' || init?.method === 'PUT' ? 'upsert' : 'get';
        
        if (method === 'upsert') {
          result = await electronAPI.invoke('api:attendance', method, getBody(), session);
        } else {
          const searchParams = new URL(url, 'http://localhost').searchParams;
          const searchData: any = {};
          if (searchParams.get('date')) searchData.date = searchParams.get('date');
          if (searchParams.get('month')) searchData.month = searchParams.get('month');
          if (searchParams.get('year')) searchData.year = searchParams.get('year');
          if (searchParams.get('employee_id')) searchData.employee_id = searchParams.get('employee_id');
          result = await electronAPI.invoke('api:attendance', method, searchData, session);
        }
      } else if (endpoint === '/api/pl-records') {
        const method = init?.method === 'POST' || init?.method === 'PUT' ? 'upsert' : 'get';
        const searchParams = new URL(url, 'http://localhost').searchParams;
        const reqData = method === 'get' ? {
          employee_id: searchParams.get('employee_id'),
          month_year: searchParams.get('month_year')
        } : getBody();
        result = await electronAPI.invoke('api:pl-records', method, reqData, session);
      } else if (endpoint === '/api/masters') {
        let method = 'get';
        if (init?.method === 'POST') {
          const body = getBody();
          method = body.type === 'department' ? 'create_department' : 'create_designation';
        } else if (init?.method === 'DELETE') {
          const body = getBody();
          method = body.type === 'department' ? 'delete_department' : 'delete_designation';
        }
        result = await electronAPI.invoke('api:masters', method, getBody(), session);
      } else if (endpoint === '/api/tenure-renewals') {
        const method = init?.method === 'POST' ? 'create' : 'get';
        const searchParams = new URL(url, 'http://localhost').searchParams;
        const reqData = method === 'get' ? { employee_id: searchParams.get('employee_id') } : getBody();
        result = await electronAPI.invoke('api:tenure-renewals', method, reqData, session);
      } else if (endpoint.startsWith('/api/ai-search')) {
        const searchParams = new URL(url, 'http://localhost').searchParams;
        const query = searchParams.get('q');
        result = await electronAPI.invoke('api:search', query);
      } else if (endpoint === '/api/leave-balances') {
        const method = init?.method === 'POST' ? 'upsert' : 'get';
        const searchParams = new URL(url, 'http://localhost').searchParams;
        const reqData = method === 'get'
          ? { employee_id: searchParams.get('employee_id'), year: searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined }
          : getBody();
        result = await electronAPI.invoke('api:leave-balances', method, reqData, session);
      } else if (endpoint === '/api/payroll-summary') {
        const searchParams = new URL(url, 'http://localhost').searchParams;
        const reqData = {
          employee_id: searchParams.get('employee_id'),
          month: searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined,
          year: searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined
        };
        result = await electronAPI.invoke('api:payroll-summary', 'get', reqData, session);
      } else {
        // Unhandled
        return originalFetch(input, init);
      }

      return {
        ok: true,
        status: 200,
        json: async () => result,
      } as Response;

    } catch (err: any) {
      console.error('IPC Fetch Error:', err);
      return {
        ok: false,
        status: 500,
        json: async () => ({ error: err.message })
      } as Response;
    }
  }

  // Pass through original fetch for standard HTTP calls
  return originalFetch(input, init);
};
