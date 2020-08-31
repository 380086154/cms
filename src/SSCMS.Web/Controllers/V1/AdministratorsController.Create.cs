﻿using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using NSwag.Annotations;
using SSCMS.Configuration;
using SSCMS.Extensions;
using SSCMS.Models;

namespace SSCMS.Web.Controllers.V1
{
    public partial class AdministratorsController
    {
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [OpenApiOperation("新增管理员 API", "注册新管理员，使用POST发起请求，请求地址为/api/v1/administrators")]
        [HttpPost, Route(Route)]
        public async Task<ActionResult<Administrator>> Create([FromBody] Administrator request)
        {
            var isApiAuthorized = _authManager.IsApi && await _accessTokenRepository.IsScopeAsync(_authManager.ApiToken, Constants.ScopeAdministrators);
            if (!isApiAuthorized) return Unauthorized();

            var (isValid, errorMessage) = await _administratorRepository.InsertAsync(request, request.Password);
            if (!isValid)
            {
                return this.Error(errorMessage);
            }

            return request;
        }
    }
}
