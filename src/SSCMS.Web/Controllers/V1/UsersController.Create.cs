﻿using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using SSCMS.Enums;
using SSCMS.Extensions;
using SSCMS.Models;

namespace SSCMS.Web.Controllers.V1
{
    public partial class UsersController
    {
        [HttpPost, Route(Route)]
        public async Task<ActionResult<User>> Create([FromBody]User request)
        {
            var config = await _configRepository.GetAsync();

            if (!config.IsUserRegistrationGroup)
            {
                request.GroupId = 0;
            }
            var password = request.Password;

            var (user, errorMessage) = await _userRepository.InsertAsync(request, password, string.Empty);
            if (user == null)
            {
                return this.Error(errorMessage);
            }

            await _statRepository.AddCountAsync(StatType.UserRegister);

            return user;
        }
    }
}
